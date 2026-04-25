/**
 * Mobile Hamburger Menu Auto-Generator
 * Injects responsive mobile navigation into generated site HTML
 */

export function generateMobileMenu(siteColor: string = "#3b82f6"): string {
  return `
    <!-- Mobile Menu Generator -->
    <style>
      .mobile-menu-toggle {
        display: none;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: ${siteColor};
        color: white;
        border: none;
        width: 48px;
        height: 48px;
        border-radius: 8px;
        cursor: pointer;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 5px;
        padding: 0;
      }

      .mobile-menu-toggle span {
        width: 24px;
        height: 2px;
        background: white;
        transition: all 0.3s ease;
        display: block;
      }

      .mobile-menu-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(8px, 8px);
      }

      .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
      }

      .mobile-menu-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -7px);
      }

      .mobile-nav-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
      }

      .mobile-nav-overlay.active {
        display: block;
      }

      .mobile-nav-menu {
        display: none;
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 320px;
        height: 100vh;
        background: white;
        z-index: 1001;
        overflow-y: auto;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        flex-direction: column;
        padding: 80px 20px 20px;
        gap: 10px;
      }

      .mobile-nav-menu.active {
        transform: translateX(0);
      }

      .mobile-nav-menu a {
        display: block;
        padding: 16px 20px;
        text-decoration: none;
        color: #1f2937;
        font-weight: 500;
        border-radius: 8px;
        transition: background 0.2s ease;
      }

      .mobile-nav-menu a:hover {
        background: #f3f4f6;
      }

      .mobile-nav-menu a.primary-btn {
        background: ${siteColor};
        color: white;
        text-align: center;
        margin-top: 10px;
      }

      @media (max-width: 768px) {
        .mobile-menu-toggle {
          display: flex;
        }

        .mobile-nav-menu {
          display: flex;
        }

        nav, .nav-links, header > ul {
          display: none !important;
        }
      }
    </style>

    <button class="mobile-menu-toggle" id="mobileMenuBtn">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <div class="mobile-nav-overlay" id="mobileOverlay"></div>

    <nav class="mobile-nav-menu" id="mobileMenu">
      <!-- Navigation links will be auto-populated from page headers -->
    </nav>

    <script>
      (function() {
        const btn = document.getElementById('mobileMenuBtn');
        const overlay = document.getElementById('mobileOverlay');
        const menu = document.getElementById('mobileMenu');

        // Auto-populate menu from existing navigation
        const navLinks = document.querySelectorAll('nav a, header a[href^="#"], .nav-links a');
        navLinks.forEach(link => {
          if (link.href && !link.href.includes('javascript')) {
            const menuLink = document.createElement('a');
            menuLink.href = link.href;
            menuLink.textContent = link.textContent;
            menu.appendChild(menuLink);
          }
        });

        // Add CTA button if exists
        const cta = document.querySelector('a.btn-primary, .cta-button, button[class*="primary"]');
        if (cta) {
          const ctaClone = cta.cloneNode(true);
          ctaClone.classList.add('primary-btn');
          menu.appendChild(ctaClone);
        }

        function toggleMenu() {
          btn.classList.toggle('active');
          overlay.classList.toggle('active');
          menu.classList.toggle('active');
        }

        btn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
        menu.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', toggleMenu);
        });
      })();
    </script>
  `;
}

export function injectMobileMenu(html: string, accentColor?: string): string {
  const mobileMenu = generateMobileMenu(accentColor);
  
  // Insert after <body> tag, before content
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (bodyMatch) {
    const insertPos = bodyMatch[0].length;
    return html.slice(0, insertPos) + mobileMenu + html.slice(insertPos);
  }
  
  return html + mobileMenu;
}
