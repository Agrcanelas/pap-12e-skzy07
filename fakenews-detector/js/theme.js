// ===== theme.js — Dark/Light theme toggle =====
(function() {
  const stored = localStorage.getItem('vf_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
})();

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  
  const updateBtn = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '🌙' : '☀️';
    btn.title = isDark ? 'Modo claro' : 'Modo escuro';
  };
  updateBtn();

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vf_theme', next);
    updateBtn();
  });

  // Mobile menu toggle
  const menuBtn = document.getElementById('mobileMenu');
  const mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      menuBtn.textContent = mobileNav.classList.contains('open') ? '✕' : '☰';
    });
  }
  
  // Toast util — globally available
  window.showToast = function(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };
});