import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { injectThemeToggle } from "@/lib/theme-injector";
import { injectEmailCaptureForm } from "@/lib/form-injector";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Only model confirmed working on this account
const MODEL = "claude-haiku-4-5-20251001";

const BUILD_PROMPT = `You are an expert web designer. Build a complete premium single-page website.

Return your response in EXACTLY this format with no text before or after:

<<<HTML>>>
[complete <!DOCTYPE html> document]
<<<END>>>
<<<MSG>>>
[one sentence: what you built]
<<<END_MSG>>>
<<<BIZ>>>
[business name]
<<<END_BIZ>>>

SITE MUST INCLUDE ALL OF THESE SECTIONS:
1. Fixed nav: logo left, links right, phone number, working mobile hamburger menu (JS toggle)
2. Hero: 100svh, bold headline targeting customer pain point, 2 CTAs, floating trust badge
3. Trust bar: 4-5 icons + labels (years in business, customers served, guarantee, etc)
4. Services: 3-6 cards with emoji icons, real descriptions inferred from the business type
5. How it works: 3 numbered steps showing customer journey
6. Testimonials: 3 reviews (name, city, ★★★★★ rating, 3-sentence specific quote)
7. FAQ: 5 questions with working JS accordion (click to expand/collapse)
8. Contact: form (name, phone, email, service dropdown, message, submit button that shows success), address, hours
9. Footer: logo, quick links, contact info, social placeholders, copyright

DESIGN RULES:
- Google Fonts: Instrument Serif (headings) + Inter (body) via <link> tag
- Choose palette based on industry: trades=dark navy+orange, travel=deep ocean blue+gold, health=white+sage, restaurant=dark+amber, default=charcoal #111+gold #c8a96e
- Mobile responsive (works on iPhone)
- smooth-scroll, hover effects on all interactive elements
- Mobile menu JS: toggle a class on click, hide/show nav links
- FAQ accordion JS: toggle visibility on click
- Form submit JS: prevent default, show "Thank you! We'll be in touch soon." message
- Write REAL copy for this specific business — no Lorem ipsum, no placeholder headlines`;

const EDIT_PROMPT = `You are an expert web designer. Edit the website based on the user's request.

Make exactly what was asked. Preserve everything else. Return the COMPLETE updated HTML document.

Return in EXACTLY this format:
<<<HTML>>>
[complete <!DOCTYPE html> document]
<<<END>>>
<<<MSG>>>
[one sentence about what changed]
<<<END_MSG>>>
<<<BIZ>>>
[business name unchanged]
<<<END_BIZ>>>`;

function extract(raw: string, fallbackBiz: string) {
  let html = "";
  let msg = "Done! What would you like to change?";
  let biz = fallbackBiz;

  const htmlMatch = raw.match(/<<<HTML>>>([\s\S]*?)<<<END>>>/);
  if (htmlMatch) html = htmlMatch[1].trim();

  const msgMatch = raw.match(/<<<MSG>>>([\s\S]*?)<<<END_MSG>>>/);
  if (msgMatch) msg = msgMatch[1].trim();

  const bizMatch = raw.match(/<<<BIZ>>>([\s\S]*?)<<<END_BIZ>>>/);
  if (bizMatch) biz = bizMatch[1].trim();

  // Fallback: grab raw HTML block
  if (!html) {
    const m = raw.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
    if (m) html = m[1];
  }

  return { html, msg, biz };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentHtml = "", businessName = "", history = [], seo } = body;

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
        content: `Current HTML:\n\`\`\`html\n${currentHtml.slice(0, 10000)}\n\`\`\`\n\nBusiness: ${businessName}\n\nRequest: ${message}`,
      });
    } else {
      messages.push({
        role: "user",
        content: `Build a complete premium website for this business: "${message}"\n\nInfer the industry, services, location tone, and design style. Write real copy. Make it look like a $10k agency built it.`,
      });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const { html, msg, biz } = extract(rawText, businessName);

    if (!html) {
      console.error("[chat-edit] No HTML extracted. Raw start:", rawText.slice(0, 400));
      return NextResponse.json({ error: "Generation failed — please try again." }, { status: 500 });
    }

    let finalHtml = html;
    try { finalHtml = injectThemeToggle(finalHtml); } catch { /* non-fatal */ }
    try { finalHtml = injectEmailCaptureForm(finalHtml, { autoTriggerDelay: 4000 }); } catch { /* non-fatal */ }

    return NextResponse.json({ html: finalHtml, message: msg, businessName: biz });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat-edit] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
