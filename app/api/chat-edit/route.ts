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
  isInitialBuild?: boolean;
  seo?: {
    title?: string;
    description?: string;
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

// ─── Bulletproof response extractor ──────────────────────────────────────────
// Claude wraps HTML in <<<HTML>>>...<<<END>>> so no JSON parsing needed.
// Falls back to raw HTML detection, then JSON parse as last resort.
function extractHtmlAndMeta(raw: string): { html: string; message: string; businessName: string } {
  // Strategy 1: delimiter-based (most reliable for large HTML)
  const delimMatch = raw.match(/<<<HTML>>>([\s\S]*?)<<<END>>>/);
  if (delimMatch) {
    const msgMatch = raw.match(/<<<MSG>>>([\s\S]*?)<<<ENDMSG>>>/);
    const bizMatch = raw.match(/<<<BIZ>>>([\s\S]*?)<<<ENDBIZ>>>/);
    return {
      html: delimMatch[1].trim(),
      message: msgMatch ? msgMatch[1].trim() : "Done! What would you like to change?",
      businessName: bizMatch ? bizMatch[1].trim() : "",
    };
  }

  // Strategy 2: raw HTML returned directly
  if (raw.includes("<!DOCTYPE html") || raw.includes("<html")) {
    const htmlStart = raw.indexOf("<!DOCTYPE html") !== -1
      ? raw.indexOf("<!DOCTYPE html")
      : raw.indexOf("<html");
    const htmlEnd = raw.lastIndexOf("</html>") + 7;
    const html = htmlEnd > htmlStart ? raw.slice(htmlStart, htmlEnd) : raw.slice(htmlStart);
    return { html, message: "Done! What would you like to change?", businessName: "" };
  }

  // Strategy 3: JSON parse with aggressive sanitization
  try {
    // Try to find the html field directly without full JSON parse
    // Extract html value between first "html": " and the matching end
    const htmlFieldMatch = raw.match(/"html"\s*:\s*"([\s\S]+?)(?:",\s*"message"|",\s*"businessName")/);
    if (htmlFieldMatch) {
      const html = htmlFieldMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      return { html, message: "Done! What would you like to change?", businessName: "" };
    }

    // Last resort: try JSON.parse on cleaned text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        html: result.html || "",
        message: result.message || "Done!",
        businessName: result.businessName || "",
      };
    }
  } catch {
    // JSON parse failed — fall through to error
  }

  throw new Error("Could not extract HTML from AI response");
}

// ─── INITIAL BUILD SYSTEM PROMPT ─────────────────────────────────────────────
const INITIAL_BUILD_PROMPT = `You are a world-class web designer and conversion strategist. Your job is to take a single business description and produce a jaw-dropping, agency-quality website that makes the owner say "holy shit, this is exactly what I needed."

You don't just build what was asked — you THINK like a senior designer who has built hundreds of sites for this type of business. You infer what the business needs, what their customers want to see, and what will actually convert visitors into leads.

## YOUR DESIGN PHILOSOPHY

**Agency-quality, not template-quality.** Every site looks like a $8,000–$15,000 custom job. Bold typography. Purposeful white space. Sections that flow. Real-looking content that sounds human.

**Think like their best customer.** What questions does a customer have before calling? What builds trust? What removes doubt? Build the site that answers all of that.

**Infer everything they didn't say.** If they say "travel agency" — you know they need destination showcases, package deals, testimonials from happy travelers, trust signals like TICO registration, a booking CTA, and a newsletter for deals. Add it all. If they say "plumber in Calgary" — emergency callouts, licensed & insured, free estimate CTA. Always think ahead.

---

## WHAT YOU ALWAYS BUILD

### 1. STICKY NAVIGATION
- Logo left, nav links right, phone number visible on desktop
- Fully functional mobile hamburger menu (JS toggle, smooth open/close)
- Smooth scroll to sections on click
- Background blurs slightly on scroll (JS scroll listener + CSS backdrop-filter)

### 2. HERO — make people stop scrolling
- Full viewport height (100svh)
- Bold headline 60–80px desktop, 36px mobile — speaks to customer desire, NOT business name
- Subheadline builds credibility
- TWO CTAs: primary action + secondary softer action
- Dark gradient or rich background — NEVER plain white
- Floating trust badge ("★ 4.9 · 500+ happy customers" or "TICO Registered" or "Licensed & Insured")

### 3. TRUST BAR
- 4–6 trust signals: certifications, years in business, cities served, customers helped, guarantee
- Horizontal strip between hero and content
- Icons (emoji OK) + short bold labels

### 4. SERVICES / DESTINATIONS / OFFERINGS
- 3–6 cards — infer from business type, make them specific not generic
- Icon + title + 2–3 line description
- Hover lift effect, grid layout, mobile responsive

### 5. HOW IT WORKS
- 3–4 numbered steps — the customer journey from enquiry to happy outcome
- Kills hesitation, builds confidence

### 6. SOCIAL PROOF — most important section
- 3 testimonials: full name, city, ★★★★★, 3–4 sentence quote that sounds genuinely human
- Avatar circles with initials
- Google review badge

### 7. ABOUT / WHY US
- Owner story, years in business, local roots
- 3–4 differentiators as bullet points
- Photo placeholder styled nicely

### 8. FAQ ACCORDION
- 5–7 questions real customers actually Google before hiring
- Functional expand/collapse JS — smooth animation
- Industry-specific questions — NOT generic

### 9. CTA BAND
- Full-width accent section, bold headline, phone + email + button
- Urgency element where appropriate

### 10. CONTACT FORM + LOCATION
- Name, Phone, Email, Service/Interest dropdown (infer options), Message, Submit
- Success message on submit (JS)
- Map placeholder styled as a grey box with pin icon
- Hours, address, contact details

### 11. FOOTER
- Logo + tagline, quick nav, services/destinations list, contact info
- Social icons (SVG or emoji), copyright, credentials badge

---

## DESIGN SYSTEM — PICK BASED ON BUSINESS TYPE

- **Trades** (plumber, electrician, HVAC, roofer): Dark navy/charcoal, bright accent (orange/blue/red), bold industrial type
- **Travel agency**: Deep ocean blue or sunset gradient, gold accents, wanderlust photography placeholders, aspirational copy
- **Health/wellness/physio**: Clean white or warm off-white, sage green or terracotta accent, rounded corners, calming
- **Professional services** (lawyer, accountant): Deep navy, gold, serif headings, prestigious feel
- **Restaurant/food**: Dark bg, amber/gold warmth, sensory language, food photography placeholders
- **Landscaping/outdoor**: Forest green, earthy tones, nature textures
- **Beauty/salon/spa**: Black or deep charcoal, rose gold, elegant feminine luxury
- **Retail/boutique**: Clean white, strong typography, product-forward
- **Tech/SaaS**: Dark mode, electric blue/purple, modern sans-serif, feature-forward
- **Default**: Dark charcoal (#111), white text, gold (#c8a96e) accent — never boring grey-on-white

---

## TECHNICAL REQUIREMENTS

- Single complete HTML file, all CSS and JS embedded
- Google Fonts: ONE pairing (e.g. "Instrument Serif" headings + "Inter" body — or choose better pair for the industry)
- Mobile-first responsive — perfect on iPhone
- Vanilla JS only — no frameworks, no CDN dependencies beyond Google Fonts
- scroll-behavior: smooth
- Hover states on ALL interactive elements
- Working: mobile menu, FAQ accordion, form success message
- Real copy — NO Lorem ipsum, NO placeholder headlines. Write actual copy for this business.

---

## COPY RULES

- Hero headline speaks to desire or pain: ✅ "Your Dream Holiday Starts Here" ❌ "Welcome to XYZ Travel"
- Every section earns its place — inform, trust-build, or convert
- Testimonials sound human: specific details, real emotions, not marketing-speak
- CTAs use action words: "Book My Trip", "Get a Free Quote", "Call Us Now"
- Use city/region if mentioned — make it feel local and specific

---

## OUTPUT FORMAT — CRITICAL

Do NOT return JSON. Do NOT wrap in markdown code blocks.

Return your response in EXACTLY this format:

<<<BIZ>>>
[exact business name]
<<<ENDBIZ>>>

<<<MSG>>>
[one punchy sentence about what you built — mention the business name and a highlight]
<<<ENDMSG>>>

<<<HTML>>>
[complete <!DOCTYPE html> document — never truncate, never use ...]
<<<END>>>

That's it. Nothing before <<<BIZ>>> and nothing after <<<END>>>.`;

// ─── EDIT SYSTEM PROMPT ───────────────────────────────────────────────────────
const EDIT_PROMPT = `You are an expert web designer making precise real-time edits to a live website via chat.

## YOUR JOB
1. Make EXACTLY what the user asked — surgical, no scope creep
2. Preserve EVERYTHING else — don't touch what wasn't mentioned
3. Return a COMPLETE valid HTML document every time
4. Edits look intentional and polished, not rushed

## RULES
- Color changes: update ALL related elements consistently
- Layout changes: update responsive CSS too
- New sections: match the existing design language
- "Make it better/more premium": improve typography, spacing, contrast
- Never truncate the HTML — return the full document

## OUTPUT FORMAT — CRITICAL

Do NOT return JSON. Return EXACTLY this:

<<<BIZ>>>
[business name — unchanged unless user asked to change it]
<<<ENDBIZ>>>

<<<MSG>>>
[one friendly sentence about what changed]
<<<ENDMSG>>>

<<<HTML>>>
[complete updated <!DOCTYPE html> document]
<<<END>>>`;

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: ChatEditRequest = await req.json();
    const { message, currentHtml, businessName, sourceUrl, history = [], seo, isInitialBuild } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const isBuildFromScratch = isInitialBuild === true || !currentHtml || currentHtml.trim() === "";
    const systemPrompt = isBuildFromScratch ? INITIAL_BUILD_PROMPT : EDIT_PROMPT;

    const conversationMessages: Anthropic.Messages.MessageParam[] = [];

    if (!isBuildFromScratch) {
      for (const msg of history.slice(-6)) {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }

    let userContent: string;

    if (isBuildFromScratch) {
      userContent = `Business description: "${message}"

Think deeply: What type of business is this? What industry? What location if mentioned? What do their customers need to see to trust them and take action?

Build the most impressive, full-featured, conversion-focused website you can. Infer everything they didn't say. Every section should feel like it was made specifically for THIS business.

Return your response using the exact delimiter format from the system prompt.`;
    } else {
      userContent = `Current site HTML:
\`\`\`html
${currentHtml.slice(0, 14000)}${currentHtml.length > 14000 ? "\n<!-- truncated for context -->" : ""}
\`\`\`

Business: ${businessName || "Unknown"}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

User request: "${message}"

Make this change precisely. Return the complete updated HTML using the delimiter format.`;
    }

    conversationMessages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: isBuildFromScratch ? 12000 : 8000,
      system: systemPrompt,
      messages: conversationMessages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract HTML using bulletproof multi-strategy extractor
    let extracted: { html: string; message: string; businessName: string };
    try {
      extracted = extractHtmlAndMeta(rawText);
    } catch (parseErr) {
      console.error("[chat-edit] Extraction failed. Raw start:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "AI response could not be parsed. Please try again." },
        { status: 500 }
      );
    }

    if (!extracted.html || extracted.html.length < 100) {
      return NextResponse.json(
        { error: "AI returned empty HTML. Please try again." },
        { status: 500 }
      );
    }

    // Auto-inject platform features
    let finalHtml = extracted.html;
    try { finalHtml = injectThemeToggle(finalHtml); } catch { /* non-fatal */ }
    try { finalHtml = injectEmailCaptureForm(finalHtml, { position: "footer", autoTriggerDelay: 4000 }); } catch { /* non-fatal */ }

    if (seo) {
      try {
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
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      html: finalHtml,
      message: extracted.message || "Done! What would you like to change next?",
      businessName: extracted.businessName || businessName,
    });

  } catch (err) {
    console.error("[chat-edit] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong — please try again." },
      { status: 500 }
    );
  }
}
