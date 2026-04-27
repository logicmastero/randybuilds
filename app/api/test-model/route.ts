import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20241022", 
  "claude-3-haiku-20240307",
  "claude-3-sonnet-20240229",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-7",
];

export async function GET(req: NextRequest) {
  const results: Record<string, string> = {};
  
  for (const model of MODELS) {
    try {
      const r = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "say hi" }],
      });
      results[model] = "✅ works";
      break; // stop at first working one
    } catch (e: any) {
      results[model] = "❌ " + (e?.message || "error").slice(0, 80);
    }
  }
  
  return NextResponse.json(results);
}
