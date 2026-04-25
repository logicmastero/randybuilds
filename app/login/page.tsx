"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=Instrument+Serif:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0b09;--bg2:#111110;--bg3:#181816;
    --border:rgba(255,255,255,0.07);--border-glow:rgba(200,169,110,0.3);
    --gold:#c8a96e;--gold-l:#d8b97e;
    --text:#e8e2d8;--text-dim:rgba(232,226,216,0.5);--text-faint:rgba(232,226,216,0.22);
    --serif:'Instrument Serif',Georgia,serif;--sans:'Inter',-apple-system,sans-serif;
  }
  html,body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;cursor:default}
  ::selection{background:rgba(200,169,110,0.22)}
  @keyframes fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes float-grid{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(.5deg)}}
  .a1{animation:fade-up .55s ease both}
  .a2{animation:fade-up .55s .08s ease both}
  .a3{animation:fade-up .55s .16s ease both}
  .a4{animation:fade-up .55s .24s ease both}
  .wrap{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}
  .left{background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between;padding:48px;position:relative;overflow:hidden}
  .left-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;animation:float-grid 12s ease-in-out infinite}
  .left-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(200,169,110,0.08) 0%,transparent 70%);bottom:-100px;left:-100px;pointer-events:none}
  .left-logo{font-family:var(--serif);font-size:22px;color:var(--text);z-index:1;position:relative}
  .left-logo span{color:var(--gold)}
  .left-content{z-index:1;position:relative}
  .left-quote{font-family:var(--serif);font-size:clamp(26px,3vw,38px);line-height:1.15;letter-spacing:-.02em;color:var(--text);margin-bottom:24px}
  .left-quote em{font-style:italic;color:var(--text-dim)}
  .left-author{font-size:13px;color:var(--text-dim)}
  .left-ticks{display:flex;flex-direction:column;gap:14px;z-index:1;position:relative}
  .tick{display:flex;align-items:center;gap:12px;font-size:14px;color:var(--text-dim)}
  .tick-icon{width:28px;height:28px;border-radius:8px;background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px}
  .right{display:flex;align-items:center;justify-content:center;padding:48px 40px}
  .card{width:100%;max-width:420px}
  .card-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
  .card-h1{font-family:var(--serif);font-size:clamp(28px,3vw,40px);letter-spacing:-.025em;font-weight:400;margin-bottom:8px}
  .card-sub{font-size:14px;color:var(--text-dim);margin-bottom:36px;line-height:1.6}
  .err-box{background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);border-radius:10px;padding:12px 16px;font-size:13px;color:#ff8080;margin-bottom:20px}
  .btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:14px;border-radius:12px;background:var(--bg2);border:1px solid var(--border);font-size:14px;font-weight:600;color:var(--text);cursor:pointer;transition:border-color .2s,background .2s,transform .15s;font-family:var(--sans);text-decoration:none}
  .btn-google:hover{border-color:rgba(200,169,110,0.3);background:var(--bg3);transform:translateY(-1px)}
  .btn-google:disabled{opacity:.5;pointer-events:none}
  .google-icon{flex-shrink:0}
  .spinner{width:18px;height:18px;border:2px solid rgba(200,169,110,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite}
  @media(max-width:768px){
    .wrap{grid-template-columns:1fr}
    .left{display:none}
    .right{padding:32px 24px;align-items:flex-start;padding-top:80px}
  }
`;

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Sign-in was cancelled. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
  google_denied: "Google sign-in was denied. Please try again.",
  no_user_info: "Could not retrieve your Google account info.",
  oauth_not_configured: "Google sign-in is not yet configured.",
};

function LoginInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const errorKey = searchParams.get("error") ?? "";
  const errorMsg = ERROR_MESSAGES[errorKey] || (errorKey ? "An error occurred. Please try again." : "");
  const next = searchParams.get("next") ?? "/dashboard";

  const handleGoogle = () => {
    setLoading(true);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  };

  return (
    <div className="wrap">
      <style>{CSS}</style>

      {/* LEFT PANEL */}
      <div className="left">
        <div className="left-grid" />
        <div className="left-glow" />
        <div className="left-logo a1">Site<span>craft</span></div>
        <div className="left-content a2">
          <div className="left-quote">
            Your site,<br /><em>built in minutes.</em>
          </div>
          <div className="left-author">Powered by AI — designed for real businesses.</div>
        </div>
        <div className="left-ticks a3">
          {[
            ["⚡", "Live preview as you type"],
            ["🎨", "One-click brand palettes"],
            ["📱", "Mobile-first by default"],
          ].map(([icon, label]) => (
            <div key={label} className="tick">
              <div className="tick-icon">{icon}</div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right">
        <div className="card">
          <div className="card-label a1">Welcome back</div>
          <div className="card-h1 a2">Sign in to Sitecraft</div>
          <div className="card-sub a3">
            Your saved sites, editor history, and account — all in one place.
          </div>

          {errorMsg && <div className="err-box a1">{errorMsg}</div>}

          <button className="btn-google a3" onClick={handleGoogle} disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg className="google-icon" width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div style={{textAlign:"center",marginTop:24,fontSize:12,color:"rgba(232,226,216,0.2)"}}>
            By signing in, you agree to our terms of service.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
