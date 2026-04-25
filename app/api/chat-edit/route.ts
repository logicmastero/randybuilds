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
  stream?: boolean;
}

const apiKey = process.env.ANTHROPIC_API_KEY_NEW ?? process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({ apiKey });

const SYSTEM_PROMPT = `You are Randy — an expert AI website builder embedded in Sitecraft, a live AI website editor.

The user is editing their website in real time through a chat interface. You receive their request plus the current HTML, and return an updated complete HTML document.

YOUR JOB:
1. Make EXACTLY the change the user requests — precisely and surgically
2. Preserve ALL existing content unless explicitly told to change it
3. Return a COMPLETE, valid HTML document every single time — never truncate
4. Make the site look premium, modern, and professional
5. Use inline CSS only — no external dependencies except Google Fonts

SPECIAL COMMANDS — recognize and handle:
- "add [section]" → append a well-designed section (hero/services/testimonials/faq/contact/gallery/pricing/team/cta)
- "remove [section]" → cleanly remove that section
- "change color to [color]" → update the primary color throughout
- "make it [style]" → dark/light/minimal/bold/colorful — retheme the whole site
- "add section above/below [X]" → insert at right position
- "undo" → respond that they should use the Ctrl+Z button
- "I'm a [business type] in [city]" → build a complete site from scratch

WHEN BUILDING FROM SCRATCH:
- Generate a COMPLETE single-page website (8-10 sections minimum)
- Include: Hero, Services, Process/How it works, Social Proof (3 testimonials), Stats, FAQ, CTA, Footer
- Use real-looking content — real-sounding business name, local phone format, actual services
- Mobile-responsive with CSS media queries
- Premium dark aesthetic by default (bg #0b0b09, accent #c8a96e) unless specified
- Typography: Instrument Serif (headings) + Inter (body) via Google Fonts

DESIGN STANDARDS:
- Hero: full-viewport, compelling headline, subtext, 2 CTAs
- Cards: subtle borders, hover effects, consistent spacing
- CTAs: gold (#c8a96e) primary, ghost secondary
- Stats strip: large numbers, clear labels
- Testimonials: star ratings, name, company
- Mobile: stack columns, touch targets ≥44px, hidden complex nav on small screens

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no code blocks:
{"html":"<complete updated HTML>","message":"What I changed (1-2 sentences, casual tone)","businessName":"Business name"}

CRITICAL RULES:
- ALWAYS return complete HTML starting with <!DOCTYPE html>
- NEVER use ellipsis, comments like "rest of content here", or truncation
- If the current HTML is long, reproduce it FULLY with only the requested changes
- Keep all sections, styles, and scripts that exist unless asked to remove them
- JSON must be valid — escape all quotes in HTML using \\"`;

export async function POST(req: NextRequest) {
  const startMs = Date.now();
  try {
    const body: ChatEditRequest = await req.json();
    const { message, currentHtml, businessName, sourceUrl, slug, history = [], stream: useStream = true } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const conversationMessages: Anthropic.Messages.MessageParam[] = [];

    for (const msg of history.slice(-8)) {
      conversationMessages.push({ role: msg.role, content: msg.content });
    }

    const userContent = `Current site HTML (${currentHtml.length} chars):
\`\`\`html
${currentHtml}
\`\`\`

Business name: ${businessName || "Unknown"}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

User request: ${message}

Return ONLY valid JSON with the updated complete HTML.`;

    conversationMessages.push({ role: "user", content: userContent });

    // ── Streaming path ─────────────────────────────────────────────────────
    if (useStream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          let fullText = "";
          try {
            const stream = await client.messages.stream({
              model: "claude-opus-4-5",
              max_tokens: 16000,
              system: SYSTEM_PROMPT,
              messages: conversationMessages,
            });

            for await (const chunk of stream) {
              if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                fullText += chunk.delta.text;
                // Stream the raw text chunks to client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`));
              }
            }

            // Parse and send final result
            let parsed: { html: string; message: string; businessName: string };
            try {
              const jsonMatch = fullText.match(/\{[\s\S]*\}/);
              parsed = JSON.parse(jsonMatch ? jsonMatch[0] : fullText);
            } catch {
              // If JSON parse fails, try to extract HTML directly
              const htmlMatch = fullText.match(/<!DOCTYPE html>[\s\S]*/i);
              parsed = {
                html: htmlMatch ? htmlMatch[0] : currentHtml,
                message: "Updated your site.",
                businessName: businessName || "Your Business",
              };
            }

            // Save to preview store
            if (parsed.html && parsed.html.length > 200) {
              const newSlug = slug || `edit-${Date.now()}`;
              Promise.all([
                savePreview(newSlug, { html: parsed.html, businessName: parsed.businessName || businessName, url: sourceUrl || "", source: "claude", createdAt: Date.now() }).catch(() => {}),
                savePreviewSession({ slug: newSlug, html: parsed.html, business_name: parsed.businessName || businessName, input_url: sourceUrl, source: "claude" }).catch(() => {}),
                logGeneration({ input_type: "description", input_value: message, success: true, duration_ms: Date.now() - startMs }).catch(() => {}),
              ]);
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, html: parsed.html, message: parsed.message, businessName: parsed.businessName })}\n\n`));
            controller.close();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("[chat-edit stream]", msg);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg, html: currentHtml, message: "Something went wrong — try again." })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // ── Non-streaming fallback ──────────────────────────────────────────────
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: { html: string; message: string; businessName: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      const htmlMatch = rawText.match(/<!DOCTYPE html>[\s\S]*/i);
      parsed = { html: htmlMatch ? htmlMatch[0] : currentHtml, message: "Updated.", businessName };
    }

    if (parsed.html?.length > 200) {
      const newSlug = slug || `edit-${Date.now()}`;
      Promise.all([
        savePreview(newSlug, { html: parsed.html, businessName: parsed.businessName || businessName, url: sourceUrl || "", source: "claude", createdAt: Date.now() }).catch(() => {}),
        savePreviewSession({ slug: newSlug, html: parsed.html, business_name: parsed.businessName || businessName, input_url: sourceUrl, source: "claude" }).catch(() => {}),
        logGeneration({ input_type: "description", input_value: message, success: true, duration_ms: Date.now() - startMs }).catch(() => {}),
      ]);
    }

    return NextResponse.json({ ok: true, html: parsed.html, message: parsed.message, businessName: parsed.businessName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat-edit]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
