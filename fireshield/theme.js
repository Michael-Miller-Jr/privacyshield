/* ============================================================
   Privacy Shield — theme.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Copyright Year (2025 - Current Year)
  const currentYear = new Date().getFullYear();
  const yearEl = document.getElementById('copyright-year');
  
  if (yearEl) {
    // If it's 2025, it just shows 2025. If it's 2026, it shows 2025 - 2026.
    if (currentYear > 2025) {
      yearEl.textContent = `2025 - ${currentYear}`;
    } else {
      yearEl.textContent = `2025`;
    }
  }

  // 2. Theme Toggle Logic
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return; // Guard clause in case the button isn't there yet

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Load initial theme from storage
  chrome.storage.local.get('pf_theme', (res) => {
    const saved = res.pf_theme || (prefersDark ? 'dark' : 'light');
    setTheme(saved);
  });

  // Toggle on click
  themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('light');
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    chrome.storage.local.set({ pf_theme: newTheme });
  });

  function setTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light');
      themeToggle.textContent = '🌙'; // Moon icon to switch back to dark
    } else {
      document.body.classList.remove('light');
      themeToggle.textContent = '☀'; // Sun icon to switch back to light
    }
  }
});