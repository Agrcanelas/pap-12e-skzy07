// ===== api.js — Cliente da API PHP/MySQL =====
// Este ficheiro conecta o frontend ao backend PHP

// --- CONFIG ---
// Altera para o URL onde o teu backend PHP está instalado
// Ex: 'http://localhost/verifact/backend'
//     'http://localhost:8080/backend'
//     'https://teusite.com/backend'
const API_BASE = '../backend/api';

// ---- HTTP helpers ----
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('vf_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, options);
    const data = await res.json();

    if (!res.ok && res.status === 401) {
      // Token expirado — limpar sessão
      localStorage.removeItem('vf_token');
      localStorage.removeItem('vf_user');
      window.location.href = '../pages/login.html';
      return null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API error:', err);
    return { ok: false, status: 0, data: { success: false, error: 'Erro de rede. Verifica se o servidor está a correr.' } };
  }
}

// ---- AUTH ----
const Auth = {
  async register(name, email, password) {
    const r = await apiRequest('auth.php?action=register', 'POST', { name, email, password });
    if (r?.ok && r.data.success) {
      localStorage.setItem('vf_token', r.data.data.token);
      localStorage.setItem('vf_user', JSON.stringify(r.data.data.user));
    }
    return r?.data;
  },

  async login(email, password) {
    const r = await apiRequest('auth.php?action=login', 'POST', { email, password });
    if (r?.ok && r.data.success) {
      localStorage.setItem('vf_token', r.data.data.token);
      localStorage.setItem('vf_user', JSON.stringify(r.data.data.user));
    }
    return r?.data;
  },

  async logout() {
    await apiRequest('auth.php?action=logout', 'POST');
    localStorage.removeItem('vf_token');
    localStorage.removeItem('vf_user');
  },

  async me() {
    const r = await apiRequest('auth.php?action=me');
    return r?.data;
  },

  getUser() {
    // Compatível com auth.js (usa vf_session) e api.js (usa vf_user)
    try {
      return JSON.parse(localStorage.getItem('vf_user'))
          || JSON.parse(localStorage.getItem('vf_session'))
          || null;
    } catch { return null; }
  },

  isLoggedIn() {
    // Verifica ambas as chaves para compatibilidade
    return !!(localStorage.getItem('vf_token') || localStorage.getItem('vf_session'));
  }
};

// ---- SCANS ----
const Scans = {
  async save(scanData) {
    const r = await apiRequest('scans.php?action=save', 'POST', scanData);
    return r?.data;
  },

  async history(limit = 20, offset = 0) {
    const r = await apiRequest(`scans.php?action=history&limit=${limit}&offset=${offset}`);
    return r?.data;
  },

  async get(id) {
    const r = await apiRequest(`scans.php?action=get&id=${id}`);
    return r?.data;
  },

  async delete(id) {
    const r = await apiRequest(`scans.php?action=delete&id=${id}`, 'DELETE');
    return r?.data;
  },

  async stats() {
    const r = await apiRequest('scans.php?action=stats');
    return r?.data;
  }
};

// ---- REPORTS ----
const Reports = {
  async save(scanId, filename, fileSizeKb = 0) {
    const r = await apiRequest('reports.php?action=save', 'POST', {
      scan_id: scanId, filename, file_size_kb: fileSizeKb
    });
    return r?.data;
  },

  async list(limit = 20, offset = 0) {
    const r = await apiRequest(`reports.php?action=list&limit=${limit}&offset=${offset}`);
    return r?.data;
  },

  async incrementDownload(reportId) {
    await apiRequest(`reports.php?action=count&id=${reportId}`, 'POST');
  },

  async delete(id) {
    const r = await apiRequest(`reports.php?action=delete&id=${id}`, 'DELETE');
    return r?.data;
  }
};

// ---- NEWS ----
const News = {
  async list(limit = 12, offset = 0) {
    const r = await apiRequest(`news.php?action=list&limit=${limit}&offset=${offset}`);
    return r?.data;
  }
};

// ---- UPDATE NAV WITH DB USER ----
function syncNavWithDB() {
  if (!Auth.isLoggedIn()) return;
  const user = Auth.getUser();
  if (!user) return;

  const loginLink = document.querySelector('a[href*="login.html"]');
  const registerLink = document.querySelector('a[href*="register.html"]');

  if (loginLink) {
    loginLink.textContent = user.name.split(' ')[0] + ' ↗';
    loginLink.href = '#';
    loginLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await Auth.logout();
      window.location.reload();
    });
  }
  if (registerLink) registerLink.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', syncNavWithDB);
