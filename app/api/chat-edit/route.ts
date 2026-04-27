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

// ============================================================
// INITIAL BUILD PROMPT — think deeply, infer everything, go big
// ============================================================
const INITIAL_BUILD_PROMPT = `You are a world-class web designer and conversion strategist. Your job is to take a single business description and produce a jaw-dropping, agency-quality website that makes the owner say "holy shit, this is exactly what I needed."

You don't just build what was asked — you THINK like a senior designer who has built hundreds of sites for this type of business. You infer what the business needs, what their customers want to see, and what will actually convert visitors into leads.

## YOUR DESIGN PHILOSOPHY

**Agency-quality, not template-quality.** Every site you build looks like a $5,000–$15,000 custom job. Bold typography. Purposeful white space. Sections that flow. Real-looking content that sounds human.

**Think like their best customer.** What questions does a customer have before calling? What builds trust? What removes doubt? Build the site that answers all of that.

**Infer everything they didn't say.** If they say "plumber in Calgary" — you know they need emergency service callouts, weekend availability, licensed & insured badges, a free estimate CTA, local neighbourhood names, and photos of real work. Add it all.

---

## WHAT YOU ALWAYS BUILD (minimum — go beyond when it fits)

### 1. STICKY NAVIGATION
- Logo left, nav links center/right
- Mobile hamburger menu (fully functional with JS toggle)
- Phone number prominently visible on desktop nav
- Smooth scroll to sections
- Slight blur/dark background on scroll

### 2. HERO — make it stop them from scrolling
- Full viewport height (100svh)
- Bold headline (60–80px on desktop) that speaks to their #1 customer pain point
- Subheadline that builds credibility
- TWO CTAs: primary (call/book) + secondary (learn more / see our work)
- Background: dark gradient OR subtle texture/pattern — NEVER plain white
- Floating badge or trust signal (e.g. "★ 4.9/5 · 200+ reviews", "Licensed & Insured", "10+ years")
- Real phone number placeholder formatted correctly

### 3. TRUST BAR / LOGOS ROW
- 4–6 trust signals: certifications, years in business, cities served, # of customers, warranty, response time
- Clean horizontal strip — separates hero from content
- Icons + short labels

### 4. SERVICES / WHAT WE DO
- 3–6 service cards with icons (use emoji or Unicode symbols — no external icon libs)
- Each card: icon, title, 2–3 line description
- Grid layout, responsive
- Subtle hover effect (lift + shadow)
- Infer the services from the business type — don't make them generic

### 5. HOW IT WORKS / PROCESS
- 3–4 numbered steps showing the customer journey
- "Call us → We come to you → Job done → You're happy"
- This section kills hesitation — include it always

### 6. SOCIAL PROOF — the most important section
- 3 detailed testimonials: full name, city, rating (★★★★★), 3–4 sentence quote that sounds real and specific
- Photo placeholders (CSS avatar circles with initials)
- Infer what customers would actually say about this type of business
- Google review count + star rating badge

### 7. ABOUT / WHY US
- Story paragraph — owner name (infer a realistic one), years in business, local roots
- 3–4 bullet points: what makes them different
- Local photo placeholder
- "Family owned", "locally operated", "fully insured" — whatever fits

### 8. FAQ
- 5–7 real questions customers ask before hiring this type of business
- Accordion expand/collapse (functional JS)
- Infer the questions from the industry — don't use generic ones

### 9. CTA BAND
- Full-width dark/accent section
- Big bold call to action: "Ready to get started? Call us today."
- Phone number large + email + "Get a free quote" button
- Urgency element if appropriate ("Same-day service available")

### 10. CONTACT FORM + MAP PLACEHOLDER
- Form: Name, Phone, Email, Service dropdown (infer 4–6 services), Message, Submit
- Map placeholder (styled div that looks like a map — grey with location pin)
- Address, phone, email, hours (infer realistic hours for the business type)

### 11. FOOTER
- Logo + tagline
- Quick links
- Services list
- Contact details
- Social media placeholders (icons)
- Copyright + license/insurance badge

---

## DESIGN SYSTEM — CHOOSE BASED ON BUSINESS TYPE

**Trades (plumber, electrician, HVAC, roofer, contractor):**
Dark navy or charcoal background. Bright accent (electric blue, safety orange, or red). Heavy bold type. Industrial feel. "We get the job done" energy.

**Health / wellness / physio / massage:**
Clean white or warm off-white. Soft accent (sage green, warm terracotta, dusty blue). Rounded corners. Calming, professional, reassuring.

**Professional services (lawyer, accountant, consultant):**
Deep navy or dark charcoal. Gold or slate accent. Serif headings. Prestigious, established, trustworthy.

**Restaurants / food:**
Dark background with warm amber/gold. Food photography placeholders. Sensory language. Appetizing.

**Landscaping / outdoor:**
Deep forest green or earthy brown. Clean white. Nature textures. "Your outdoor space transformed."

**Beauty / salon / spa:**
Black or deep charcoal. Rose gold or champagne accent. Elegant, feminine, luxurious.

**Default (when unsure):** Dark charcoal (#111) background. White text. Gold (#c8a96e) accent. Never use boring grey-on-white.

---

## TECHNICAL REQUIREMENTS

- Single complete HTML file with embedded CSS and JS
- Google Fonts: use ONE pairing — e.g. "Instrument Serif" for headings + "Inter" for body
- Mobile-first responsive (works perfectly on iPhone)
- All animations: CSS only or vanilla JS — no external libraries
- Smooth scroll: `scroll-behavior: smooth`
- Hover states on all interactive elements
- Form submit shows a success message (JS)
- FAQ accordion works (JS toggle)
- Mobile menu works (JS toggle)
- No placeholder text like "Lorem ipsum" — write REAL copy that sounds human

---

## COPY WRITING RULES

- Headlines: speak to the customer's pain or desire, not the business's ego
  ✅ "Hot water at 2am? We're already on the way."
  ❌ "Welcome to ABC Plumbing Services"
- Every section has a purpose — inform, build trust, or convert
- Testimonials sound like real humans wrote them, not marketing
- CTAs use action language: "Get My Free Quote", "Call Us Now", "Book Online Today"
- Use the city/region they mentioned — make it feel local
- Infer a realistic phone number (e.g. 403-XXX-XXXX for Calgary, 780-XXX-XXXX for Edmonton)

---

## OUTPUT FORMAT

Return ONLY valid JSON — no markdown, no explanation outside the JSON:

{
  "html": "<complete HTML document>",
  "message": "One punchy sentence about what you built — name the business, mention a highlight (e.g. 'Built Rocky Mountain Plumbing — 11 sections, FAQ, contact form, and a hero that should stop anyone from scrolling.')",
  "businessName": "Exact business name extracted from the prompt"
}

The HTML must be a complete, valid HTML5 document starting with <!DOCTYPE html>.
Never truncate. Never use "...". Build the whole thing.`;

// ============================================================
// EDIT PROMPT — surgical, precise, preserves everything else
// ============================================================
const EDIT_PROMPT = `You are an expert web designer making real-time edits to a live website through a chat interface. Think of yourself as a designer sitting next to the user, immediately executing their requests.

## YOUR JOB
1. Make EXACTLY what the user asked — precise, no guessing
2. Preserve EVERYTHING else — don't touch sections the user didn't mention
3. Return a COMPLETE valid HTML document every time
4. Make edits that look intentional and polished, not rushed

## EDIT QUALITY RULES
- Color changes: update ALL related elements (text, borders, buttons, backgrounds that use the old color)
- Layout changes: update responsive CSS too, not just desktop
- Adding sections: make them match the existing design system of the site
- Text changes: write in the same voice/tone as existing copy
- "Make it better": interpret this as the user wanting more premium — improve typography, spacing, contrast

## RESPONSE FORMAT — return ONLY valid JSON:
{
  "html": "<complete updated HTML document>",
  "message": "One friendly sentence about what changed",
  "businessName": "Business name (unchanged unless explicitly changed)"
}

Never truncate. Never use "...". Always return the complete document.`;

export async function POST(req: NextRequest) {
  try {
    const body: ChatEditRequest = await req.json();
    const { message, currentHtml, businessName, sourceUrl, history = [], seo, isInitialBuild } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Detect initial build: no existing HTML or explicitly flagged
    const isBuildFromScratch = isInitialBuild === true || !currentHtml || currentHtml.trim() === "";

    const systemPrompt = isBuildFromScratch ? INITIAL_BUILD_PROMPT : EDIT_PROMPT;

    // Build messages
    const conversationMessages: Anthropic.Messages.MessageParam[] = [];

    if (!isBuildFromScratch) {
      // For edits: include recent history
      for (const msg of history.slice(-6)) {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Build the user content
    let userContent: string;

    if (isBuildFromScratch) {
      userContent = `Business description: "${message}"

Think deeply about this business. What type of business is it? What city/region? What are their customers' biggest questions and hesitations? What makes a great website for this industry?

Then build the most impressive, conversion-focused website you can. Infer everything they didn't say. Make them go "wow" when they see it.

Return the complete JSON response.`;
    } else {
      userContent = `Current site HTML:
\`\`\`html
${currentHtml.slice(0, 14000)}${currentHtml.length > 14000 ? "\n<!-- truncated -->" : ""}
\`\`\`

Business: ${businessName || "Unknown"}
${sourceUrl ? `Source URL: ${sourceUrl}` : ""}

User request: "${message}"

Make this change precisely. Return the complete updated HTML as JSON.`;
    }

    conversationMessages.push({ role: "user", content: userContent });

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: isBuildFromScratch ? 12000 : 8000,
      system: systemPrompt,
      messages: conversationMessages,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON
    let result: { html: string; message: string; businessName?: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      if (rawText.includes("<!DOCTYPE") || rawText.includes("<html")) {
        result = { html: rawText, message: "Done! Here's your site.", businessName };
      } else {
        return NextResponse.json({ error: "Failed to parse AI response", raw: rawText.slice(0, 300) }, { status: 500 });
      }
    }

    // Auto-inject platform features
    let finalHtml = result.html;
    finalHtml = injectThemeToggle(finalHtml);
    finalHtml = injectEmailCaptureForm(finalHtml, { position: "footer", autoTriggerDelay: 4000 });

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
      message: result.message || "Done! What would you like to change next?",
      businessName: result.businessName || businessName,
    });

  } catch (err) {
    console.error("[chat-edit] Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
