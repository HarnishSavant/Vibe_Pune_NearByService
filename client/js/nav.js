/**
 * VibePune — nav.js
 * ==================
 * Shared Navigation, Mobile Drawer, Theme Switcher & Saved Badge Synchronizer.
 * Loaded across all multipage views (Landing, Discover, Vibe, Events, Insights, Saved, About).
 */

'use strict';

const VibePuneNav = (() => {
  const STORAGE_KEY_THEME = 'vibepune_theme';
  const STORAGE_KEY_SAVED = 'vibepune_saved_places';

  function init() {
    initTheme();
    initActiveNavLinks();
    updateSavedBadge();
    initMobileDrawer();
    initScrollHeader();

    // Listen to localStorage changes across browser tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY_SAVED) updateSavedBadge();
      if (e.key === STORAGE_KEY_THEME) applyTheme(e.newValue || 'light');
    });
  }

  // ------------------------------------------------------------------
  // 1. Theme Toggle Management
  // ------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    applyTheme(initialTheme);

    // Bind all theme toggles
    const themeButtons = document.querySelectorAll('.btn-theme-toggle, #btn-theme-toggle');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (e) {}

    // Update icons
    const lightIcons = document.querySelectorAll('.theme-icon-light, #theme-icon-light');
    const darkIcons = document.querySelectorAll('.theme-icon-dark, #theme-icon-dark');

    if (theme === 'dark') {
      lightIcons.forEach(i => i.classList.add('hidden'));
      darkIcons.forEach(i => i.classList.remove('hidden'));
    } else {
      lightIcons.forEach(i => i.classList.remove('hidden'));
      darkIcons.forEach(i => i.classList.add('hidden'));
    }

    // Notify map if initialized to swap tiles
    if (window.VibePuneMap && typeof window.VibePuneMap.updateThemeTiles === 'function') {
      window.VibePuneMap.updateThemeTiles(theme);
    }
  }

  // ------------------------------------------------------------------
  // 2. Active Page Highlighting
  // ------------------------------------------------------------------
  function initActiveNavLinks() {
    const path = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.site-nav__link, .mobile-nav-link');

    navLinks.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      // Match exact filename or homepage
      const isHome = (href === 'index.html' || href === './' || href === '/') && (path.endsWith('/') || path.endsWith('/index.html') || path === '');
      const isMatch = isHome || (href && path.endsWith(href));

      if (isMatch) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  // ------------------------------------------------------------------
  // 3. Saved Places Badge Counter
  // ------------------------------------------------------------------
  function updateSavedBadge() {
    let count = 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED);
      if (raw) {
        const parsed = JSON.parse(raw);
        count = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      count = 0;
    }

    const badges = document.querySelectorAll('.header-counter-badge, #saved-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  }

  // ------------------------------------------------------------------
  // 4. Mobile Navigation Drawer
  // ------------------------------------------------------------------
  function initMobileDrawer() {
    const openBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const closeBtn = document.getElementById('mobile-nav-close');

    if (!backdrop) return;

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        backdrop.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    }

    function closeDrawer() {
      backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeDrawer();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeDrawer();
    });
  }

  // ------------------------------------------------------------------
  // 5. Header Scroll Effect
  // ------------------------------------------------------------------
  function initScrollHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }

  return {
    init,
    applyTheme,
    updateSavedBadge,
  };
})();

// Auto-boot navigation on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', VibePuneNav.init);
} else {
  VibePuneNav.init();
}

window.VibePuneNav = VibePuneNav;
