import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { injectThemeToggle } from "@/lib/theme-injector";
import { injectSEOMeta } from "@/lib/seo-injector";
import { injectEmailCaptureForm } from "@/lib/form-injector";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BUILD_PROMPT = `You are an expert web designer. Build a complete, premium single-page website.

ALWAYS return a full HTML document using EXACTLY this format — nothing before or after:

<<<HTML>>>
<!DOCTYPE html>
<html lang="en">
...complete site...
</html>
<<<END>>>
<<<MSG>>>
One sentence describing what you built.
<<<END_MSG>>>
<<<BIZ>>>
Business name extracted from the prompt
<<<END_BIZ>>>

SITE REQUIREMENTS — always include ALL of these:
1. Sticky nav with logo + links + phone number + mobile hamburger (working JS)
2. Full-height hero (100svh) — bold headline speaking to customer pain, 2 CTAs, trust badge
3. Trust bar — 4-5 signals (years, customers, certifications, guarantee)
4. Services section — 3-6 cards with emoji icons, inferred from business type
5. How it works — 3 numbered steps
6. Testimonials — 3 detailed reviews (name, city, ★★★★★, 3-sentence quote)
7. FAQ accordion — 5 questions (working JS expand/collapse)
8. Contact section — form (name, phone, email, service dropdown, message, submit) + hours + address
9. Footer — logo, links, contact, social placeholders, copyright

DESIGN:
- Google Fonts: Instrument Serif (headings) + Inter (body)
- Pick color palette based on industry (trades=dark navy+orange, travel=deep blue+gold, health=white+sage, etc)
- Mobile-responsive, hover states, smooth scroll
- Real copy — NO Lorem ipsum. Write actual headlines and content for this specific business.
- Hamburger menu JS must work. FAQ accordion JS must work. Form shows success message on submit.`;

const EDIT_PROMPT = `You are an expert web designer editing a live website via chat.

Make EXACTLY what the user asked. Preserve everything else. Return the COMPLETE updated HTML document.

Use EXACTLY this format:
<<<HTML>>>
<!DOCTYPE html>
...complete updated site...
</html>
<<<END>>>
<<<MSG>>>
One sentence about what changed.
<<<END_MSG>>>
<<<BIZ>>>
Business name (unchanged)
<<<END_BIZ>>>`;

function extract(raw: string, businessName: string) {
  let html = "";
  let msg = "Done! What would you like to change next?";
  let biz = businessName;

  // Primary: custom delimiters
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
    }

    const userContent = isNew
      ? `Business: ${message}\n\nBuild a full premium website for this business. Infer everything — services, copy, design style, location tone. Make it look like a $10k agency job.`
      : `Current HTML:\n\`\`\`html\n${currentHtml.slice(0, 12000)}\n\`\`\`\n\nBusiness: ${businessName}\n\nRequest: ${message}`;

    messages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const { html, msg, biz } = extract(rawText, businessName);

    if (!html) {
      console.error("[chat-edit] No HTML in response. Raw:", rawText.slice(0, 300));
      return NextResponse.json({ error: "No HTML generated. Please try again." }, { status: 500 });
    }

    let finalHtml = html;
    try { finalHtml = injectThemeToggle(finalHtml); } catch { /* non-fatal */ }
    try { finalHtml = injectEmailCaptureForm(finalHtml, { autoTriggerDelay: 4000 }); } catch { /* non-fatal */ }
    if (seo) {
      try {
        finalHtml = injectSEOMeta(finalHtml, {
          title: seo.title || businessName,
          description: seo.description || "",
          businessName: seo.businessName || businessName,
          businessType: seo.businessType || "Organization",
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ html: finalHtml, message: msg, businessName: biz });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[chat-edit]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
