/**
 * form-injector.ts
 * Injects an email capture form into generated sites.
 */

export interface FormInjectorOptions {
  position?: "footer" | "modal";
  autoTriggerDelay?: number;
}

export function injectEmailCaptureForm(html: string, options: FormInjectorOptions = {}): string {
  if (!html || !html.includes("</body>")) return html;

  const { autoTriggerDelay = 3000 } = options;

  const formHtml = `
<style>
  #sc-lead-modal {
    display: none; position: fixed; bottom: 24px; right: 24px; z-index: 9998;
    background: #1a1a18; border: 1px solid rgba(200,169,110,0.25); border-radius: 16px;
    padding: 24px; width: 300px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: scSlideUp 0.3s ease;
  }
  @keyframes scSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  #sc-lead-modal.visible { display: block; }
  #sc-lead-modal h4 { color: #c8a96e; font-size: 16px; margin-bottom: 6px; font-family: inherit; }
  #sc-lead-modal p { color: #888; font-size: 13px; margin-bottom: 16px; font-family: inherit; }
  #sc-lead-form input {
    width: 100%; background: #0d0d0b; border: 1px solid #2a2a22; border-radius: 8px;
    padding: 10px 12px; color: #e8e0d0; font-size: 14px; font-family: inherit;
    margin-bottom: 10px; outline: none; box-sizing: border-box;
  }
  #sc-lead-form input:focus { border-color: rgba(200,169,110,0.5); }
  #sc-lead-form button {
    width: 100%; background: #c8a96e; color: #0a0a08; border: none; border-radius: 8px;
    padding: 11px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit;
  }
  #sc-lead-form button:hover { background: #d4b87e; }
  #sc-lead-close {
    position: absolute; top: 12px; right: 14px; background: none; border: none;
    color: #555; font-size: 18px; cursor: pointer; line-height: 1;
  }
  #sc-lead-success { display: none; text-align: center; padding: 8px 0; }
  #sc-lead-success p { color: #c8a96e; font-weight: 600; font-size: 15px; }
</style>
<div id="sc-lead-modal">
  <button id="sc-lead-close" aria-label="Close">✕</button>
  <h4>Get a Free Quote</h4>
  <p>Leave your email and we'll reach out within 24 hours.</p>
  <form id="sc-lead-form" onsubmit="scSubmitLead(event)">
    <input type="text" placeholder="Your name" required>
    <input type="email" placeholder="Your email" required>
    <button type="submit">Send My Info →</button>
  </form>
  <div id="sc-lead-success"><p>✓ Got it! We'll be in touch soon.</p></div>
</div>
<script>
(function() {
  var shown = sessionStorage.getItem('sc-lead-shown');
  if (!shown) {
    setTimeout(function() {
      var m = document.getElementById('sc-lead-modal');
      if (m) { m.classList.add('visible'); sessionStorage.setItem('sc-lead-shown','1'); }
    }, ${autoTriggerDelay});
  }
  var closeBtn = document.getElementById('sc-lead-close');
  if (closeBtn) closeBtn.addEventListener('click', function() {
    document.getElementById('sc-lead-modal').classList.remove('visible');
  });
})();
function scSubmitLead(e) {
  e.preventDefault();
  document.getElementById('sc-lead-form').style.display = 'none';
  document.getElementById('sc-lead-success').style.display = 'block';
  setTimeout(function() { document.getElementById('sc-lead-modal').classList.remove('visible'); }, 2500);
}
</script>`;

  return html.replace("</body>", formHtml + "\n</body>");
}
