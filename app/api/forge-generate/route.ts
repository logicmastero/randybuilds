import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY_NEW ?? process.env.ANTHROPIC_API_KEY,
});

const PERSONALITY_GUIDES: Record<string, string> = {
  "warm-expert":   "You are warm, knowledgeable, and reassuring. You combine expertise with genuine care. Never condescending. Always approachable.",
  "sharp-advisor": "You are direct, no-nonsense, and results-focused. You cut to the chase. You respect people's time. No fluff.",
  "creative-spark":"You are enthusiastic, inventive, and big-picture. You energize conversations. You see possibilities others miss.",
  "calm-guide":    "You are patient, thorough, and detail-oriented. You never rush. You make complex things clear. You give people confidence.",
  "bold-closer":   "You are confident, persuasive, and action-oriented. You move things forward. You know the value you deliver and aren't shy about it.",
};

const TONE_GUIDES: Record<string, string> = {
  "professional": "Maintain a polished, business-appropriate tone. Complete sentences, proper grammar, no slang.",
  "casual":       "Be conversational and friendly. Contractions are fine. Write like you're talking to a real person.",
  "playful":      "Light-hearted and fun. Use humor where appropriate. Keep energy high.",
  "premium":      "Elevated and refined. Every word is deliberate. Think luxury hotel concierge.",
  "technical":    "Precise and detailed. Comfortable with technical terms. Accurate over accessible.",
};

export async function POST(req: NextRequest) {
  try {
    const { config } = await req.json();

    const {
      name = "Agent",
      tagline = "AI-powered assistant",
      personality = "warm-expert",
      tone = "professional",
      expertise = [],
      channels = [],
      integrations = [],
      businessContext = "",
      responseStyle = "",
      industry = "",
      capabilities = [],
      avatarEmoji = "✦",
      primaryColor = "#c8a96e",
    } = config;

    const prompt = `Generate a complete, production-ready AI agent system prompt and configuration document for the following agent:

NAME: ${name}
TAGLINE: ${tagline}
INDUSTRY: ${industry}
PERSONALITY: ${personality} — ${PERSONALITY_GUIDES[personality] || "Helpful and professional."}
TONE: ${tone} — ${TONE_GUIDES[tone] || "Professional and clear."}
EXPERTISE AREAS: ${expertise.join(", ") || "General business knowledge"}
CAPABILITIES: ${capabilities.join(", ") || "Answer questions, help customers"}
CHANNELS: ${channels.join(", ")}
INTEGRATIONS: ${integrations.join(", ") || "None specified"}
AVATAR: ${avatarEmoji}
COLOR: ${primaryColor}
BUSINESS CONTEXT:
${businessContext || "A professional business in the " + industry + " industry."}
CUSTOM RESPONSE STYLE: ${responseStyle || "None specified"}

Generate a comprehensive system prompt that:
1. Defines the agent's identity, name, and personality in vivid detail
2. Sets clear behavioral rules and communication style
3. Covers how to handle common scenarios (greetings, questions, escalation, unknown topics)
4. Specifies what information to collect and when
5. Includes example responses showing the right tone
6. Defines hard limits (what the agent should never do)
7. If integrations are listed, explains how the agent should use them
8. Ends with a deployment checklist

Make it genuinely excellent — this should work as a real production system prompt. Write it as markdown that the user can copy and paste directly into Base44, Claude Projects, or any AI platform.

Format:
# ${name} — AI Agent System Prompt

[Full comprehensive system prompt]

---
## Deployment Guide
[Step-by-step instructions for deploying on Base44, Claude Projects, and via API]

---
## Configuration Summary
[Quick reference table of all settings]`;

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const code = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[forge-generate]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
