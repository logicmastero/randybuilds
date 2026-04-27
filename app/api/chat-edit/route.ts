import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { injectThemeToggle } from "@/lib/theme-injector";
import { injectEmailCaptureForm } from "@/lib/form-injector";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

const BUILD_PROMPT = `You are an expert web designer. Build a complete, beautiful single-page website.

IMPORTANT: Return ONLY the raw HTML document. No explanation. No markdown. No code blocks. Just the HTML.

Start your response with <!DOCTYPE html> and end with </html>.

The site MUST include:
- Fixed navigation: logo, links, phone number, working mobile hamburger (JS)
- Hero: bold headline about customer pain, subtext, 2 CTA buttons, trust badge
- Services: 3-4 cards with emoji icons
- Testimonials: 3 reviews with name, city, 5 stars, quote
- FAQ: 4 questions, working accordion (JS)
- Contact form: name, phone, email, message, submit (shows success on JS submit)
- Footer: logo, links, copyright

Design:
- Google Fonts: Instrument Serif (headings) + Inter (body)
- Strong color palette matching the industry (travel=deep blue+gold, trades=navy+orange, health=white+sage, default=charcoal+gold #c8a96e)
- Mobile responsive
- Real copy — no Lorem ipsum

Write TIGHT, efficient CSS and HTML. Keep the total response under 6000 tokens.`;

const EDIT_PROMPT = `You are an expert web designer editing a live website.

Make EXACTLY what was asked. Preserve everything else.

Return ONLY the complete raw HTML document. No explanation. No markdown. No code blocks.
Start with <!DOCTYPE html>, end with </html>.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentHtml = "", businessName = "", history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const isNew = !currentHtml || currentHtml.trim().length < 50;
    const systemPrompt = isNew ? BUILD_PROMPT : EDIT_PROMPT;

    const messages: Anthropic.Messages.MessageParam[] = [];

    if (!isNew) {
      for (const m of (history as {role:"user"|"assistant";content:string}[]).slice(-4)) {
        messages.push({ role: m.role, content: m.content });
      }
      messages.push({
        role: "user",
        content: `Current HTML:\n${currentHtml.slice(0, 8000)}\n\nBusiness: ${businessName}\n\nRequest: ${message}\n\nReturn the full updated HTML only.`,
      });
    } else {
      messages.push({
        role: "user",
        content: `Build a complete premium website for: "${message}"\n\nInfer the industry, write real copy, pick the right color palette. Return the full HTML only — start with <!DOCTYPE html>.`,
      });
    }

    // Use streaming to collect the full response before returning
    let fullText = "";
    
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullText += chunk.delta.text;
      }
    }

    // Extract HTML — it should be the whole response
    let html = fullText.trim();
    
    // Clean up if wrapped in code block
    if (html.startsWith("```html")) {
      html = html.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
    } else if (html.startsWith("```")) {
      html = html.replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
    }

    // Verify it's HTML
    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      console.error("[chat-edit] Not HTML. Got:", html.slice(0, 200));
      return NextResponse.json({ error: "AI returned non-HTML content. Please try again." }, { status: 500 });
    }

    // Inject platform features
    try { html = injectThemeToggle(html); } catch { /* non-fatal */ }
    try { html = injectEmailCaptureForm(html, { autoTriggerDelay: 4000 }); } catch { /* non-fatal */ }

    // Extract business name from HTML title if not provided
    let detectedBiz = businessName;
    if (!detectedBiz) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) detectedBiz = titleMatch[1].split(/[—\-|]/)[0].trim();
    }

    return NextResponse.json({
      html,
      message: isNew ? `Built your ${detectedBiz || "business"} website — ready to customize!` : "Done! What else would you like to change?",
      businessName: detectedBiz,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat-edit] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
