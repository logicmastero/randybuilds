import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

const BUILD_PROMPT = `You are an expert web designer. Build a complete, beautiful single-page website.

CRITICAL STRUCTURE — build each section in this EXACT order, one at a time:
1. HTML head + CSS styles (full stylesheet)
2. <nav> — fixed navigation, logo, links, phone, mobile hamburger
3. <section id="hero"> — bold headline, subtext, 2 CTAs, trust badge
4. <section id="services"> — 3-4 service cards with icons
5. <section id="testimonials"> — 3 reviews, name, city, 5 stars
6. <section id="faq"> — 4 questions, accordion JS
7. <section id="contact"> — full contact form, JS submit handler
8. <footer> — logo, links, copyright
9. Closing </body></html>

After EACH section, output exactly: <!--SECTION_DONE-->

Design rules:
- Google Fonts: Instrument Serif (headings) + Inter (body)
- Strong industry-matched palette (trades=navy+orange, health=white+sage, food=warm+cream, default=charcoal+gold #c8a96e)
- Mobile responsive
- Real copy — NO Lorem ipsum
- Total under 7000 tokens

Return ONLY raw HTML. No explanation. No markdown. No code blocks. Start with <!DOCTYPE html>.`;

const EDIT_PROMPT = `You are an expert web designer editing a live website.
Make EXACTLY what was asked. Preserve everything else.
Return ONLY the complete raw HTML. No explanation. No markdown. No code blocks.
Start with <!DOCTYPE html>, end with </html>.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, currentHtml = "", businessName = "", history = [] } = body;
    if (!message) return new Response("Message required", { status: 400 });

    const isNew = !currentHtml || currentHtml.trim().length < 50;

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
        content: `Build a complete premium website for: "${message}"\n\nInfer the industry, write real copy, pick the right color palette. Return full HTML only — start with <!DOCTYPE html>.`,
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!isNew) {
            // Edit mode: collect full response, send as one chunk
            let fullText = "";
            const aiStream = await client.messages.stream({
              model: MODEL,
              max_tokens: 8000,
              system: EDIT_PROMPT,
              messages,
            });
            for await (const chunk of aiStream) {
              if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                fullText += chunk.delta.text;
              }
            }
            let html = fullText.trim();
            if (html.startsWith("```")) html = html.replace(/^```html?\s*/i,"").replace(/```\s*$/,"").trim();
            
            // Detect biz name
            let biz = businessName;
            if (!biz) {
              const m = html.match(/<title>([^<]+)<\/title>/i);
              if (m) biz = m[1].split(/[—\-|]/)[0].trim();
            }

            const payload = JSON.stringify({ type: "complete", html, businessName: biz, message: "Done! What else would you like to change?" });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            controller.close();
            return;
          }

          // Build mode: STREAM section by section
          let buffer = "";
          let sectionCount = 0;
          let detectedBiz = businessName;

          const aiStream = await client.messages.stream({
            model: MODEL,
            max_tokens: 8000,
            system: BUILD_PROMPT,
            messages,
          });

          for await (const chunk of aiStream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              buffer += chunk.delta.text;

              // Stream raw HTML chunks to client as they arrive (for live preview)
              if (chunk.delta.text) {
                const raw = JSON.stringify({ type: "chunk", text: chunk.delta.text });
                controller.enqueue(encoder.encode(`data: ${raw}\n\n`));
              }

              // Detect section boundaries
              while (buffer.includes("<!--SECTION_DONE-->")) {
                const idx = buffer.indexOf("<!--SECTION_DONE-->");
                sectionCount++;
                const sectionPayload = JSON.stringify({ type: "section", count: sectionCount });
                controller.enqueue(encoder.encode(`data: ${sectionPayload}\n\n`));
                buffer = buffer.slice(idx + "<!--SECTION_DONE-->".length);
              }
            }
          }

          // Final complete signal
          // Reconstruct full HTML from what was streamed
          if (!detectedBiz) {
            // Already streamed everything, biz name detection happens on client
          }

          const donePayload = JSON.stringify({
            type: "done",
            businessName: detectedBiz,
            message: `Built your website — ready to customize!`
          });
          controller.enqueue(encoder.encode(`data: ${donePayload}\n\n`));
          controller.close();

        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          const errPayload = JSON.stringify({ type: "error", message: msg });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
