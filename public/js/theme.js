const STORAGE_KEY = 'numduel-theme';

function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'auto';
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
}

function updateThemeToggleButton(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const icons = { auto: 'monitor', light: 'sun', dark: 'moon' };
  const labels = { auto: 'System theme', light: 'Light mode', dark: 'Dark mode' };
  btn.setAttribute('aria-label', labels[theme]);
  btn.setAttribute('title', labels[theme]);
  const icon = btn.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', icons[theme]);
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nodes: [icon] });
    }
  }
}

function cycleTheme() {
  const current = getTheme();
  const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  updateThemeToggleButton(next);
}

// Apply theme immediately (before DOMContentLoaded) to avoid FOUC
applyTheme(getTheme());

document.addEventListener('DOMContentLoaded', () => {
  updateThemeToggleButton(getTheme());
  document.getElementById('themeToggleBtn')?.addEventListener('click', cycleTheme);
});
