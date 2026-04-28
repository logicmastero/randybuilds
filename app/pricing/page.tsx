"use client";
import { useState, useEffect } from "react";


const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
    --border:rgba(255,255,255,0.07);
    --gold:#c8a96e;--gold-l:#d8b97e;
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh}
  @keyframes fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .a1{animation:fade-up .5s ease both}
  .a2{animation:fade-up .5s .07s ease both}
  .a3{animation:fade-up .5s .14s ease both}
  .a4{animation:fade-up .5s .21s ease both}
  /* NAV */
  .nav{position:sticky;top:0;z-index:50;background:rgba(11,11,9,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px}
  .nav-logo{font-family:var(--serif);font-size:17px;color:var(--text);text-decoration:none}
  .nav-logo span{color:var(--gold)}
  .nav-links{display:flex;gap:28px}
  .nav-link{font-size:14px;color:var(--text-dim);text-decoration:none;transition:color .2s}
  .nav-link:hover,.nav-link.active{color:var(--text)}
  .nav-cta{padding:8px 18px;background:var(--gold);color:#0b0b09;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;transition:background .15s}
  .nav-cta:hover{background:var(--gold-l)}
  /* PAGE */
  .page{max-width:1060px;margin:0 auto;padding:80px 32px}
  .label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
  .h1{font-family:var(--serif);font-size:clamp(36px,5vw,64px);letter-spacing:-.03em;line-height:1.08;margin-bottom:16px}
  .h1 em{font-style:italic;color:var(--text-dim)}
  .sub{font-size:16px;color:var(--text-dim);max-width:520px;line-height:1.7;margin-bottom:64px}
  /* TOGGLE */
  .toggle-wrap{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:56px}
  .toggle-lbl{font-size:14px;font-weight:500}
  .toggle-lbl.dim{color:var(--text-dim)}
  .toggle-badge{font-size:11px;font-weight:700;background:rgba(200,169,110,0.12);color:var(--gold);border:1px solid rgba(200,169,110,0.2);border-radius:100px;padding:3px 9px;margin-left:8px}
  .toggle-btn{width:44px;height:24px;border-radius:100px;background:rgba(255,255,255,0.08);border:none;cursor:pointer;position:relative;transition:background .2s}
  .toggle-btn.on{background:var(--gold)}
  .toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#0b0b09;transition:transform .2s}
  .toggle-btn.on .toggle-thumb{transform:translateX(20px)}
  /* PLANS */
  .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:80px}
  .plan{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:32px;position:relative;transition:border-color .25s,transform .2s}
  .plan:hover{border-color:rgba(200,169,110,0.2);transform:translateY(-3px)}
  .plan.featured{background:linear-gradient(145deg,rgba(200,169,110,0.06) 0%,var(--bg2) 100%);border-color:rgba(200,169,110,0.3)}
  .featured-badge{position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0b0b09;font-size:11px;font-weight:800;letter-spacing:.05em;padding:5px 16px;border-radius:0 0 10px 10px;text-transform:uppercase}
  .plan-tier{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:16px}
  .plan-price{font-family:var(--serif);font-size:52px;letter-spacing:-.04em;line-height:1;margin-bottom:4px}
  .plan-price sup{font-size:22px;vertical-align:top;margin-top:10px;margin-right:2px}
  .plan-period{font-size:13px;color:var(--text-dim);margin-bottom:24px}
  .plan-div{height:1px;background:var(--border);margin-bottom:24px}
  .plan-desc{font-size:14px;color:var(--text-dim);line-height:1.6;margin-bottom:24px}
  .feats{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
  .feat{display:flex;gap:10px;font-size:14px;color:var(--text-dim);line-height:1.4}
  .feat-chk{color:var(--gold);font-size:13px;flex-shrink:0;margin-top:1px}
  .feat strong{color:var(--text);font-weight:600}
  .plan-btn{width:100%;padding:14px;border-radius:10px;font-size:14px;font-weight:700;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;transition:all .2s;font-family:var(--sans);text-decoration:none;display:block;text-align:center}
  .plan-btn:hover{border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.05)}
  .plan-btn.gold{background:var(--gold);color:#0b0b09;border-color:var(--gold)}
  .plan-btn.gold:hover{background:var(--gold-l)}
  /* COMPARISON */
  .compare{margin-bottom:80px}
  .compare-title{font-family:var(--serif);font-size:clamp(24px,3vw,36px);letter-spacing:-.02em;margin-bottom:8px}
  .compare-sub{font-size:14px;color:var(--text-dim);margin-bottom:32px}
  .comp-table{width:100%;border-collapse:collapse}
  .comp-table th{text-align:left;padding:12px 16px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);border-bottom:1px solid var(--border)}
  .comp-table th:not(:first-child){text-align:center}
  .comp-table td{padding:14px 16px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.04)}
  .comp-table td:not(:first-child){text-align:center}
  .comp-table tr:hover td{background:rgba(255,255,255,0.015)}
  .check{color:var(--gold);font-weight:700}
  .cross{color:rgba(255,255,255,0.15)}
  .partial{color:var(--text-dim);font-size:12px}
  .comp-highlight{background:rgba(200,169,110,0.04);border-left:2px solid rgba(200,169,110,0.3)}
  /* FAQ */
  .faq{margin-bottom:80px}
  .faq-title{font-family:var(--serif);font-size:clamp(24px,3vw,36px);letter-spacing:-.02em;margin-bottom:32px}
  .faq-item{border-bottom:1px solid var(--border)}
  .faq-q{width:100%;padding:20px 0;display:flex;align-items:center;justify-content:space-between;background:none;border:none;color:var(--text);font-size:15px;font-weight:600;cursor:pointer;text-align:left;font-family:var(--sans);letter-spacing:-.01em;gap:16px}
  .faq-arrow{font-size:18px;color:var(--text-dim);transition:transform .2s;flex-shrink:0}
  .faq-arrow.open{transform:rotate(45deg);color:var(--gold)}
  .faq-a{overflow:hidden;max-height:0;transition:max-height .3s ease,padding .3s ease}
  .faq-a.open{max-height:400px;padding-bottom:20px}
  .faq-a p{font-size:14px;color:var(--text-dim);line-height:1.75}
  /* CTA BAND */
  .cta-band{background:linear-gradient(135deg,rgba(200,169,110,0.07) 0%,rgba(200,169,110,0.02) 100%);border:1px solid rgba(200,169,110,0.2);border-radius:20px;padding:56px;text-align:center}
  .cta-band-h{font-family:var(--serif);font-size:clamp(28px,3.5vw,44px);letter-spacing:-.025em;margin-bottom:12px}
  .cta-band-h em{font-style:italic;color:var(--text-dim)}
  .cta-band-sub{font-size:15px;color:var(--text-dim);margin-bottom:32px;line-height:1.65}
  .btn-gold{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:-.01em;background:var(--gold);color:#0b0b09;border:none;cursor:pointer;transition:background .15s,transform .15s;font-family:var(--sans);text-decoration:none}
  .btn-gold:hover{background:var(--gold-l);transform:translateY(-1px)}
  @media(max-width:768px){
    .plans{grid-template-columns:1fr}
    .page{padding:48px 20px}
    .nav{padding:0 16px}
    .nav-links{display:none}
    .cta-band{padding:36px 24px}
    .comp-table{font-size:12px}
    .comp-table th,.comp-table td{padding:10px 8px}
  }
`;

const PLANS = [
  {
    tier: "Starter",
    price: 800,
    period: "CAD one-time",
    desc: "Perfect for creators, freelancers, and small businesses who need a clean, professional site fast.",
    feats: [
      { t: "5-page professional site", d: "Home, About, Services, Gallery, Contact" },
      { t: "Mobile-first design", d: "Looks perfect on every device" },
      { t: "Contact form + Google Maps", d: "Customers can reach you instantly" },
      { t: "Basic SEO setup", d: "Found in local search results" },
      { t: "1 revision round", d: "We refine until it's right" },
      { t: "Live in 5 business days", d: "" },
    ],
    cta: "Get started →",
    gold: false,
  },
  {
    tier: "Standard",
    price: 1800,
    period: "CAD one-time",
    desc: "For businesses that want to stand out, generate leads, and convert visitors into paying customers.",
    feats: [
      { t: "Up to 10 custom pages", d: "Built around your business goals" },
      { t: "Custom branding + logo", d: "Full visual identity included" },
      { t: "Booking & quote forms", d: "Leads come straight to your inbox" },
      { t: "Full SEO + Google Analytics", d: "Track traffic, rank higher" },
      { t: "Blog setup ready", d: "Start posting content day one" },
      { t: "3 revision rounds", d: "" },
      { t: "Live in 8 business days", d: "" },
    ],
    cta: "Get Standard →",
    gold: true,
    featured: true,
  },
  {
    tier: "Retainer",
    price: 200,
    period: "CAD per month",
    desc: "For businesses that want their site handled — updates, hosting, monitoring, and SEO — with zero headaches.",
    feats: [
      { t: "Monthly content updates", d: "New offers, photos, pages — just ask" },
      { t: "Managed hosting + SSL", d: "Fast, secure, never goes down" },
      { t: "Performance monitoring", d: "We catch issues before you do" },
      { t: "Priority response", d: "24-hour turnaround on changes" },
      { t: "Quarterly SEO review", d: "Stay ahead of your competition" },
      { t: "Cancel any time", d: "" },
    ],
    cta: "Start retainer →",
    gold: false,
  },
];

const COMPARE = [
  { feature: "Custom AI-generated design", starter: true, standard: true, retainer: true },
  { feature: "Mobile-first responsive", starter: true, standard: true, retainer: true },
  { feature: "Contact form", starter: true, standard: true, retainer: true },
  { feature: "Google Analytics setup", starter: false, standard: true, retainer: true },
  { feature: "Full SEO optimization", starter: "Basic", standard: true, retainer: true },
  { feature: "Custom logo / branding", starter: false, standard: true, retainer: "Updates" },
  { feature: "Booking / quote system", starter: false, standard: true, retainer: true },
  { feature: "Blog / news section", starter: false, standard: true, retainer: true },
  { feature: "Monthly content updates", starter: false, standard: false, retainer: true },
  { feature: "Hosting + SSL managed", starter: false, standard: false, retainer: true },
  { feature: "Priority support", starter: false, standard: false, retainer: true },
];

const FAQS = [
  { q: "Do I need to provide anything to get started?", a: "Nope. If you have an existing website, just paste the URL. If you don't, describe your business in a few sentences. That's it. We handle the rest — design, copy, images, and launch." },
  { q: "How is this different from Wix or Squarespace?", a: "Wix and Squarespace give you a template and leave you alone. We design something custom for YOUR business, write the copy, set up the technical stuff, and deliver a site that's actually built to convert. No drag-and-drop guesswork on your end." },
  { q: "What if I don't like what you build?", a: "Every package includes revision rounds. We work with you until it feels right. If after revisions you're genuinely unhappy, we'll refund you — no drama." },
  { q: "Can I add more pages later?", a: "Yes. After launch, additional pages start at $150 each. Retainer clients get minor page additions included in their monthly fee." },
  { q: "Do you handle hosting and domain setup?", a: "Yes. We'll set up your domain, connect hosting, configure SSL, and make sure everything loads fast. Hosting is included in the Retainer plan. For one-time builds, we recommend a hosting provider and help you get set up." },
  { q: "What's your turnaround for changes on the Retainer plan?", a: "24 hours for most requests. Complex additions (new pages, new features) are scoped and quoted separately." },
  { q: "Do I own my website after it's built?", a: "100%. You own every file, every piece of code, and your domain. We don't hold anything hostage. If you ever want to move on, we'll hand everything over cleanly." },
];

const renderVal = (v: boolean | string) => {
  if (v === true) return <span className="check">✓</span>;
  if (v === false) return <span className="cross">—</span>;
  return <span className="partial">{v}</span>;
};

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    setCheckingOut(planKey);
    setCheckoutErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      setCheckoutErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCheckingOut(null);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(user => { if (user?.email) setIsLoggedIn(true); })
      .catch(() => {});
  }, []);

  return (
    <div>
      <style>{CSS}</style>
      <nav className="nav">
        <a href="/" className="nav-logo">Site<span>craft</span></a>
        <div className="nav-links">
          <a href="/#how" className="nav-link">How it works</a>
          <a href="/pricing" className="nav-link active">Pricing</a>
          <a href="mailto:hello@sitecraftai.com" className="nav-link">Contact</a>
        </div>
        {isLoggedIn
          ? <a href="/dashboard" className="nav-cta">Dashboard →</a>
          : <a href="/login" className="nav-cta">Get started free →</a>}
      </nav>

      <div className="page">
        <div className="label a1">Pricing</div>
        <h1 className="h1 a2">Straightforward pricing.<br /><em>No agency markup.</em></h1>
        <p className="sub a3">Pay once for a site that lasts years. Or let us manage it monthly. Either way, you get something that actually works.</p>

        {/* BILLING TOGGLE */}
        <div className="toggle-wrap a3">
          <span className={`toggle-lbl ${!annual ? "" : "dim"}`}>One-time</span>
          <button className={`toggle-btn ${annual ? "on" : ""}`} onClick={() => setAnnual(!annual)}>
            <span className="toggle-thumb" />
          </button>
          <span className={`toggle-lbl ${annual ? "" : "dim"}`}>
            Monthly
            <span className="toggle-badge">Save 15%</span>
          </span>
        </div>

        {/* PLAN CARDS */}
        <div className="plans a4">
          {PLANS.map((plan) => {
            const price = annual && plan.tier === "Retainer"
              ? Math.round(plan.price * 0.85)
              : plan.price;
            return (
              <div key={plan.tier} className={`plan${plan.featured ? " featured" : ""}`}>
                {plan.featured && <div className="featured-badge">Most Popular</div>}
                <div className="plan-tier">{plan.tier}</div>
                <div className="plan-price"><sup>$</sup>{price.toLocaleString()}</div>
                <div className="plan-period">{plan.period}</div>
                <div className="plan-div" />
                <div className="plan-desc">{plan.desc}</div>
                <ul className="feats">
                  {plan.feats.map((f) => (
                    <li key={f.t} className="feat">
                      <span className="feat-chk">✓</span>
                      <span><strong>{f.t}</strong>{f.d ? ` — ${f.d}` : ""}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`plan-btn${plan.gold ? " gold" : ""}`}
                  onClick={() => handleCheckout(plan.tier.toLowerCase())}
                  disabled={checkingOut === plan.tier.toLowerCase()}
                >
                  {checkingOut === plan.tier.toLowerCase() ? "Redirecting…" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {checkoutErr && (
          <div style={{background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.25)",borderRadius:12,padding:"14px 20px",fontSize:13,color:"#ff6060",marginBottom:20}}>
            {checkoutErr}
          </div>
        )}

        {/* COMPARISON TABLE */}
        <div className="compare">
          <div className="compare-title">What's actually included</div>
          <div className="compare-sub">A clear breakdown so you know exactly what you're paying for.</div>
          <table className="comp-table">
            <thead>
              <tr>
                <th style={{width:"40%"}}>Feature</th>
                <th>Starter</th>
                <th style={{background:"rgba(200,169,110,0.04)",color:"var(--gold)"}}>Standard</th>
                <th>Retainer</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.feature}>
                  <td style={{color:"var(--text)"}}>{row.feature}</td>
                  <td>{renderVal(row.starter)}</td>
                  <td className="comp-highlight">{renderVal(row.standard)}</td>
                  <td>{renderVal(row.retainer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="faq">
          <div className="faq-title">Frequently asked</div>
          {FAQS.map((item, i) => (
            <div key={i} className="faq-item">
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {item.q}
                <span className={`faq-arrow${openFaq === i ? " open" : ""}`}>+</span>
              </button>
              <div className={`faq-a${openFaq === i ? " open" : ""}`}>
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA BAND */}
        <div className="cta-band">
          <div className="cta-band-h">See your site before you spend <em>a single dollar.</em></div>
          <div className="cta-band-sub">Generate a free preview in 60 seconds — no login, no card, no commitment.<br />You'll know immediately if this is for you.</div>
          <a href="/login" className="btn-gold">Build my site free →</a>
        </div>
      </div>
    </div>
  );
}
