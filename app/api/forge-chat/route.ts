import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_NEW ?? process.env.ANTHROPIC_API_KEY,
});

const SYSTEM = `You are Randy, the AI assistant inside Sitecraft's "Forge" — an AI agent builder. You help users configure their custom AI agent.

Your job is to:
1. Answer questions about how to configure their agent (personality, tone, expertise, channels)
2. Give concrete suggestions based on their industry and business type
3. Be brief, friendly, and actionable — 2-4 sentences max per response
4. When appropriate, suggest specific values they should use (e.g. "For a law firm, I'd go with 'Sharp Advisor' personality and 'Professional' tone")
5. If they ask you to fill in or help with something, respond with a "patch" JSON object as well

When you want to update the agent config, include a JSON object at the very end of your response like:
PATCH:{"personality":"warm-expert","tone":"professional"}

Only include fields you actually want to update. Available fields: name, tagline, personality, tone, industry, businessContext, responseStyle, avatarEmoji, primaryColor.

Available personality IDs: warm-expert, sharp-advisor, creative-spark, calm-guide, bold-closer
Available tone IDs: professional, casual, playful, premium, technical`;

export async function POST(req: NextRequest) {
  try {
    const { message, config, history = [] } = await req.json();

    const messages: Anthropic.Messages.MessageParam[] = [
      ...history.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: `Current agent config: ${JSON.stringify(config, null, 2)}\n\nUser message: ${message}`,
      },
    ];

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract patch if present
    const patchMatch = rawText.match(/PATCH:(\{[^}]+\})/);
    let patch: Record<string, string> | null = null;
    let reply = rawText;

    if (patchMatch) {
      try {
        patch = JSON.parse(patchMatch[1]);
        reply = rawText.replace(/PATCH:\{[^}]+\}/, "").trim();
      } catch { /* ignore bad patch */ }
    }

    return NextResponse.json({ reply, patch });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ reply: "Something went wrong — try again.", patch: null, error: msg });
  }
}
