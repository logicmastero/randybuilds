/**
 * theme-injector.ts
 * Injects a dark/light mode toggle button into generated sites.
 */

export function injectThemeToggle(html: string): string {
  if (!html || !html.includes("</body>")) return html;

  const toggleScript = `
<style>
  [data-theme="light"] { filter: invert(1) hue-rotate(180deg); }
  [data-theme="light"] img, [data-theme="light"] video { filter: invert(1) hue-rotate(180deg); }
  #sc-theme-btn {
    position: fixed; bottom: 20px; left: 20px; z-index: 9999;
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,0.1); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.15); cursor: pointer;
    font-size: 18px; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; color: inherit;
  }
  #sc-theme-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
</style>
<button id="sc-theme-btn" title="Toggle theme" aria-label="Toggle dark/light mode">🌙</button>
<script>
(function() {
  var btn = document.getElementById('sc-theme-btn');
  var theme = localStorage.getItem('sc-theme') || 'dark';
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    btn.textContent = t === 'dark' ? '🌙' : '☀️';
  }
  apply(theme);
  btn.addEventListener('click', function() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sc-theme', theme);
    apply(theme);
  });
})();
</script>`;

  return html.replace("</body>", toggleScript + "\n</body>");
}
