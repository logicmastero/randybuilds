import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { injectThemeToggle } from "@/lib/theme-injector";
import { injectSEOMeta } from "@/lib/seo-injector";
import { injectEmailCaptureForm } from "@/lib/form-injector";

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
  history?: Message[];
  seo?: {
    title: string;
    description: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    businessType?: string;
    businessName?: string;
    address?: string;
    phone?: string;
    email?: string;
    canonical?: string;
  };
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Randy — an expert AI website builder embedded in Sitecraft, a live AI website editor.

The user is building or editing their website in real time through a chat interface. You receive their request plus the current HTML of their site, and you return an updated version of the complete HTML.

YOUR JOB:
1. Make EXACTLY the change the user requests — no more, no less (unless the change requires structural updates)
2. Preserve all existing content unless explicitly told to change it
3. Return a COMPLETE, valid HTML document every time — never truncate
4. Make the site look premium, modern, and professional

WHEN BUILDING FROM SCRATCH (currentHtml is empty or user describes their business):
- Generate a complete, beautiful single-page website
- Include: Hero, Services/Features, Social Proof (testimonials), CTA section, Footer
- Use real-looking copy — real placeholders for phone, address etc
- Make it mobile-responsive with a strong dark or light aesthetic
- Bold typography, strong CTAs, modern layout

DESIGN PRINCIPLES:
- Premium over generic — custom, not template-looking
- Every section converts visitors to customers
- Typography: Google Fonts (Instrument Serif for headings, Inter for body)
- Colors: strong contrast, purposeful palette, accent color for CTAs
- Mobile-responsive is non-negotiable

RESPONSE FORMAT — you MUST use this exact format:
<<<MSG>>>
Brief friendly message about what you built or changed (1-2 sentences max)
<<<END_MSG>>>
<<<BIZ>>>
Business name (extract from prompt or preserve existing)
<<<END_BIZ>>>
<<<HTML>>>
<!DOCTYPE html>
<html>
... complete HTML document here ...
</html>
<<<END_HTML>>>

CRITICAL:
- ALWAYS output the complete HTML — never truncate, never use "..."
- The HTML section must be a full valid document with <!DOCTYPE html>
- Never use JSON — only use the <<<>>> delimiter format above
- The <<<HTML>>> block must contain the entire page, fully rendered`;

export async function POST(req: NextRequest) {
  try {
    const body: ChatEditRequest = await req.json();
    const { message, currentHtml, businessName, sourceUrl, history = [], seo } = body;

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

    const isInitialBuild = !currentHtml || currentHtml.trim().length < 100;

    // Add the current request with context
    const userContent = isInitialBuild
      ? `Build a complete, premium, conversion-focused website for this business: ${message}.

Business name: ${businessName || message.split(/[—\-]/)[0].trim()}
${sourceUrl ? `Source URL for reference: ${sourceUrl}` : ""}

Requirements:
- Full single-page website with: Hero, Services, Testimonials, CTA, Footer
- Premium design — bold typography, strong CTAs, mobile-responsive
- Use Google Fonts (Instrument Serif + Inter)
- Include realistic placeholder content (phone, address, reviews)
- Dark/premium aesthetic by default
- Make it look like a professional agency built it

Return in the required delimiter format.`
      : `Current website HTML:
\`\`\`html
${currentHtml.slice(0, 15000)}${currentHtml.length > 15000 ? "\n<!-- ... -->" : ""}
\`\`\`

Business name: ${businessName || "Unknown"}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

User request: ${message}

Return the complete updated HTML in the required delimiter format.`;

    conversationMessages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse delimiter-based response
    let html = "";
    let msg = "Done! What would you like to change next?";
    let biz = businessName;

    // Extract HTML
    const htmlMatch = rawText.match(/<<<HTML>>>([\s\S]*?)<<<END_HTML>>>/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }

    // Extract message
    const msgMatch = rawText.match(/<<<MSG>>>([\s\S]*?)<<<END_MSG>>>/);
    if (msgMatch) {
      msg = msgMatch[1].trim();
    }

    // Extract business name
    const bizMatch = rawText.match(/<<<BIZ>>>([\s\S]*?)<<<END_BIZ>>>/);
    if (bizMatch) {
      biz = bizMatch[1].trim();
    }

    // Fallback: try to extract raw HTML if delimiters failed
    if (!html) {
      const doctypeMatch = rawText.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
      if (doctypeMatch) {
        html = doctypeMatch[1];
      }
    }

    if (!html) {
      console.error("[chat-edit] No HTML extracted. Raw:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "AI did not return valid HTML. Please try again." },
        { status: 500 }
      );
    }

    // ✅ AUTO-INJECT FEATURES into all generated sites
    let finalHtml = html;

    // 1. Theme toggle (dark/light mode)
    finalHtml = injectThemeToggle(finalHtml);

    // 2. Email capture form (lead gen)
    finalHtml = injectEmailCaptureForm(finalHtml, {
      position: "footer",
      autoTriggerDelay: 3000,
    });

    // 3. SEO meta tags
    if (seo) {
      finalHtml = injectSEOMeta(finalHtml, {
        title: seo.title || businessName || "Untitled",
        description: seo.description || "Welcome to our site",
        ogImage: seo.ogImage,
        ogTitle: seo.ogTitle,
        ogDescription: seo.ogDescription,
        businessType: (seo.businessType as any) || "Organization",
        businessName: seo.businessName || businessName,
        address: seo.address,
        phone: seo.phone,
        email: seo.email,
        canonical: seo.canonical,
      });
    }

    return NextResponse.json({
      html: finalHtml,
      message: msg,
      businessName: biz,
    });
  } catch (err) {
    console.error("[chat-edit] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
