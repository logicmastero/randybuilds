import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { savePreviewSession, logGeneration } from "../../../lib/db";
import { savePreview } from "../../../lib/preview-store";

export const maxDuration = 60;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatEditRequest {
  message: string;
  currentHtml: string;
  businessName: string;
  sourceUrl?: string;
  slug?: string;
  history?: Message[];
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Randy — an expert AI website builder embedded in RandyBuilds, a live AI website editor (like Lovable or Base44).

The user is editing their website in real time through a chat interface. You receive their request plus the current HTML of their site, and you return an updated version of the complete HTML.

YOUR JOB:
1. Make EXACTLY the change the user requests — no more, no less (unless the change requires structural updates)
2. Preserve all existing content unless explicitly told to change it
3. Return a COMPLETE, valid HTML document every time
4. Make the site look premium, modern, and professional
5. Use clean CSS — no external dependencies except Google Fonts and standard CDNs

WHEN BUILDING FROM SCRATCH (user describes their business):
- Generate a complete, beautiful single-page website
- Include: Hero, Services/Features, Social Proof (testimonials), CTA section, Footer
- Use real-looking content (real phone numbers, addresses are optional but include placeholders that look real)
- Make it mobile-responsive
- Use a dark, premium aesthetic as default unless they specify otherwise

DESIGN PRINCIPLES:
- Premium over generic — this is not a template, it's custom
- Every section has purpose and converts visitors to customers
- Typography: system-ui or Google Fonts (Instrument Serif for headings, Inter for body is a great combo)
- Colors: use strong contrast, purposeful palette
- CTAs: clear, prominent, action-oriented

RESPONSE FORMAT — return ONLY valid JSON:
{
  "html": "<complete updated HTML document>",
  "message": "Brief friendly message about what you changed (1-2 sentences)",
  "businessName": "Business name if changed, otherwise the existing one"
}

IMPORTANT:
- ALWAYS return complete HTML (not fragments)
- The html must be a full valid HTML document with <!DOCTYPE html>
- Never truncate or use "..." in the HTML
- Keep all existing sections unless explicitly asked to remove them`;

export async function POST(req: NextRequest) {
  try {
    const body: ChatEditRequest = await req.json();
    const { message, currentHtml, businessName, sourceUrl, slug, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build conversation context
    const conversationMessages: Anthropic.Messages.MessageParam[] = [];

    // Add history (last 6 turns)
    for (const msg of history.slice(-6)) {
      conversationMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add the current request with context
    const userContent = `Current website HTML:
\`\`\`html
${currentHtml.slice(0, 12000)}${currentHtml.length > 12000 ? "\n<!-- ... truncated ... -->" : ""}
\`\`\`

Business name: ${businessName || "Unknown"}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

User request: ${message}

Return the complete updated HTML and a brief message about what you changed.`;

    conversationMessages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    let result: { html: string; message: string; businessName?: string };
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: if Claude returned raw HTML somehow
      if (rawText.includes("<!DOCTYPE html") || rawText.includes("<html")) {
        result = {
          html: rawText,
          message: "Done! Here's your updated site.",
          businessName,
        };
      } else {
        return NextResponse.json(
          { error: "Failed to parse AI response", raw: rawText.slice(0, 200) },
          { status: 500 }
        );
      }
    }

    const finalHtml = result.html;
    const finalName = result.businessName || businessName;

    // Persist updated HTML to both Redis and Neon (non-blocking)
    if (slug) {
      savePreview(slug, {
        html: finalHtml,
        businessName: finalName,
        url: sourceUrl,
        source: "claude",
        createdAt: Date.now(),
      }).catch((e: unknown) => console.error("[chat-edit] Redis save:", e));

      savePreviewSession({
        slug,
        business_name: finalName,
        html: finalHtml,
        input_url: sourceUrl || undefined,
        source: "claude",
      }).catch((e: unknown) => console.error("[chat-edit] Neon save:", e));
    }

    // Log the edit
    logGeneration({
      input_type: "edit",
      input_value: message.slice(0, 200),
      model: "claude-opus-4-5",
      duration_ms: response.usage ? undefined : undefined,
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      html: finalHtml,
      message: result.message || "Done! What would you like to change next?",
      businessName: finalName,
    });
  } catch (err) {
    console.error("[chat-edit] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
