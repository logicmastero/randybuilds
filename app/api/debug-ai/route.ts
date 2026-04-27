import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{ role: "user", content: message || "Return this exact text: <<<HTML>>>hello<<<END>>>" }],
  });
  
  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ raw, length: raw.length });
}
