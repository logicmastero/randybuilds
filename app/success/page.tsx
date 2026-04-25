"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.25);
    --gold:#c8a96e;--gold-l:#d8b97e;
    --green:#4ade80;
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;display:flex;align-items:center;justify-content:center}
  @keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes scale-in{from{opacity:0;transform:scale(0.6)}to{opacity:1;transform:scale(1)}}
  @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}
  .wrap{max-width:480px;width:100%;padding:40px 24px;text-align:center}
  .check-wrap{position:relative;width:80px;height:80px;margin:0 auto 32px;animation:scale-in .5s cubic-bezier(.34,1.56,.64,1) both}
  .check-ring{position:absolute;inset:0;border-radius:50%;border:2px solid var(--green);animation:pulse-ring 1.6s ease-out .4s infinite}
  .check-circle{width:80px;height:80px;border-radius:50%;background:rgba(74,222,128,0.12);border:2px solid rgba(74,222,128,0.4);display:flex;align-items:center;justify-content:center;font-size:32px;position:relative;z-index:1}
  .label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green);margin-bottom:12px;animation:fade-up .5s .1s ease both}
  .h1{font-family:var(--serif);font-size:clamp(28px,4vw,40px);letter-spacing:-.025em;line-height:1.15;margin-bottom:16px;animation:fade-up .5s .18s ease both}
  .sub{font-size:15px;color:var(--text-dim);line-height:1.65;margin-bottom:36px;animation:fade-up .5s .25s ease both}
  .card{background:var(--bg2);border:1px solid var(--border-glow);border-radius:16px;padding:24px;margin-bottom:32px;text-align:left;animation:fade-up .5s .32s ease both}
  .card-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)}
  .card-row:last-child{border-bottom:none}
  .card-icon{font-size:18px;width:32px;text-align:center;flex-shrink:0}
  .card-text{font-size:13px;color:var(--text-dim)}
  .card-text strong{color:var(--text)}
  .btns{display:flex;flex-direction:column;gap:10px;animation:fade-up .5s .4s ease both}
  .btn{display:block;padding:14px 24px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;text-align:center;transition:all .18s;font-family:var(--sans)}
  .btn-gold{background:var(--gold);color:#0b0b09;border:1px solid var(--gold)}
  .btn-gold:hover{background:var(--gold-l)}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text-dim)}
  .btn-ghost:hover{border-color:rgba(200,169,110,0.3);color:var(--text)}
`;

const PLAN_NEXT_STEPS: Record<string, Array<{ icon: string; text: React.ReactNode }>> = {
  starter: [
    { icon: "📬", text: <><strong>Check your email</strong> — you'll get a confirmation and intake form within a few minutes.</> },
    { icon: "📋", text: <><strong>Fill in the brief</strong> — tell us about your business, logo, colors, and any content you have.</> },
    { icon: "🚀", text: <><strong>Live in 5 business days</strong> — we'll share a preview for your approval before going live.</> },
  ],
  standard: [
    { icon: "📬", text: <><strong>Check your email</strong> — confirmation + intake questionnaire incoming.</> },
    { icon: "📞", text: <><strong>Intro call booked</strong> — we'll reach out to schedule a 30-minute discovery call.</> },
    { icon: "🎨", text: <><strong>Custom design review</strong> — you'll see your site before a single pixel goes live.</> },
    { icon: "🚀", text: <><strong>Live in 8 business days</strong> — full SEO setup and 3 revision rounds included.</> },
  ],
  retainer: [
    { icon: "📬", text: <><strong>Check your email</strong> — welcome email with your account details is on its way.</> },
    { icon: "🔑", text: <><strong>Access your client portal</strong> — log update requests, track changes, view your site metrics.</> },
    { icon: "📆", text: <><strong>First month starts today</strong> — request your first update anytime.</> },
  ],
};

function SuccessInner() {
  const params = useSearchParams();
  const plan = (params.get("plan") || "standard").toLowerCase();
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const steps = PLAN_NEXT_STEPS[plan] || PLAN_NEXT_STEPS.standard;

  return (
    <div className="wrap">
      <div className="check-wrap">
        <div className="check-ring" />
        <div className="check-circle">✓</div>
      </div>
      <div className="label">Payment confirmed</div>
      <h1 className="h1">You're all set,<br />let's get building.</h1>
      <p className="sub">
        Your <strong>{planLabel} plan</strong> is confirmed. Here's what happens next.
      </p>
      <div className="card">
        {steps.map((step, i) => (
          <div key={i} className="card-row">
            <span className="card-icon">{step.icon}</span>
            <span className="card-text">{step.text}</span>
          </div>
        ))}
      </div>
      <div className="btns">
        <a href="/build" className="btn btn-gold">✦ Start building your site →</a>
        <a href="/" className="btn btn-ghost">Back to home</a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <style>{CSS}</style>
      <Suspense fallback={<div style={{ color: "rgba(232,226,216,0.4)", fontSize: 14 }}>Loading…</div>}>
        <SuccessInner />
      </Suspense>
    </>
  );
}
