// ===== auth.js — Login / Register (usa API PHP/MySQL) =====
// Requer api.js carregado antes deste ficheiro

const AUTH_KEY    = 'vf_users';
const SESSION_KEY = 'vf_session';

// Fallback em memória se localStorage não estiver disponível
let _memUsers   = [];
let _memSession = null;

function storageAvailable() {
  try { localStorage.setItem('__test__','1'); localStorage.removeItem('__test__'); return true; }
  catch(e) { return false; }
}

function getUsers() {
  try {
    if (storageAvailable()) return JSON.parse(localStorage.getItem(AUTH_KEY) || '[]');
    return _memUsers;
  } catch { return _memUsers; }
}

function saveUsers(users) {
  try {
    _memUsers = users;
    if (storageAvailable()) localStorage.setItem(AUTH_KEY, JSON.stringify(users));
  } catch { _memUsers = users; }
}

function getSession() {
  try {
    if (storageAvailable()) return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return _memSession;
  } catch { return _memSession; }
}

function setSession(user) {
  try {
    _memSession = user;
    if (storageAvailable()) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch { _memSession = user; }
}

function clearSession() {
  try {
    _memSession = null;
    if (storageAvailable()) localStorage.removeItem(SESSION_KEY);
  } catch { _memSession = null; }
}

function hashSimple(str) {
  // Simple hash for demo (NOT for production!)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

// ---- LOGIN ----
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Já autenticado?
  if (getSession()) {
    window.location.href = '../index.html';
    return;
  }

  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    errEl.classList.remove('show');

    if (!email || !password) {
      errEl.textContent = 'Preenche todos os campos.';
      errEl.classList.add('show');
      return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ A entrar...';

    // Login local (sem base de dados)
    const users = getUsers();
    const user  = users.find(u => u.email === email && u.password === hashSimple(password));

    if (user) {
      const sessionData = { id: user.id, name: user.name, email: user.email };
      setSession(sessionData);
      // Garantir que fica guardado mesmo sem localStorage
      try { localStorage.setItem('vf_session', JSON.stringify(sessionData)); } catch(e) {}
      btn.textContent = '✓ Sucesso!';
      setTimeout(() => window.location.href = '../index.html', 600);
    } else {
      errEl.textContent = 'Email ou palavra-passe incorretos.';
      errEl.classList.add('show');
      btn.disabled    = false;
      btn.textContent = 'Entrar';
    }
  });

  document.getElementById('togglePw')?.addEventListener('click', () => {
    const input = document.getElementById('loginPassword');
    input.type  = input.type === 'password' ? 'text' : 'password';
  });
}

// ---- REGISTER ----
function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const errEl     = document.getElementById('registerError');
  const successEl = document.getElementById('registerSuccess');
  const btn       = document.getElementById('registerBtn');
  const pwInput   = document.getElementById('registerPassword');

  // Password strength indicator
  if (pwInput) {
    pwInput.addEventListener('input', () => {
      const pw   = pwInput.value;
      const segs = document.querySelectorAll('.pw-strength-seg');
      const label = document.querySelector('.pw-strength-label');
      let strength = 0;
      if (pw.length >= 6)            strength++;
      if (pw.length >= 10)           strength++;
      if (/[A-Z]/.test(pw))         strength++;
      if (/[0-9]/.test(pw))         strength++;
      if (/[^A-Za-z0-9]/.test(pw))  strength++;

      const levels = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
      const colors = ['', '#ff3366', '#ff6b35', '#ffd700', '#00d4ff', '#00f5a0'];
      if (label) { label.textContent = levels[strength] || ''; label.style.color = colors[strength] || ''; }
      segs.forEach((seg, i) => {
        seg.style.background = i < strength ? (colors[strength] || '#00f5a0') : 'var(--bg3)';
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.remove('show');
    successEl.classList.remove('show');

    const name     = document.getElementById('registerName').value.trim();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm  = document.getElementById('registerConfirm').value;

    if (!name || !email || !password || !confirm) {
      errEl.textContent = 'Preenche todos os campos.'; errEl.classList.add('show'); return;
    }
    if (password.length < 6) {
      errEl.textContent = 'A palavra-passe deve ter pelo menos 6 caracteres.'; errEl.classList.add('show'); return;
    }
    if (password !== confirm) {
      errEl.textContent = 'As palavras-passe não coincidem.'; errEl.classList.add('show'); return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ A criar conta...';

    try {
      // Registar localmente (sem base de dados)
      const users = getUsers();
      if (users.find(u => u.email === email)) {
        errEl.textContent = 'Este email já está registado.';
        errEl.classList.add('show');
        btn.disabled    = false;
        btn.textContent = 'Criar Conta';
        return;
      }

      const newUser = { id: Date.now(), name, email, password: hashSimple(password), createdAt: new Date().toISOString() };
      users.push(newUser);
      saveUsers(users);
      const sessionData = { id: newUser.id, name, email };
      setSession(sessionData);
      // Garantir que fica guardado mesmo sem localStorage
      try { localStorage.setItem('vf_session', JSON.stringify(sessionData)); } catch(e) {}

      successEl.textContent = `✓ Conta criada! Bem-vindo, ${name}! A redirecionar...`;
      successEl.classList.add('show');
      btn.textContent = '✓ Sucesso!';
      setTimeout(() => window.location.href = '../index.html', 1200);
    } catch(err) {
      console.error('Erro ao criar conta:', err);
      errEl.textContent = 'Erro ao criar conta. Tenta novamente.';
      errEl.classList.add('show');
      btn.disabled    = false;
      btn.textContent = 'Criar Conta';
    }
  });

  document.getElementById('togglePw')?.addEventListener('click', () => {
    const i = document.getElementById('registerPassword');
    i.type  = i.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('togglePw2')?.addEventListener('click', () => {
    const i = document.getElementById('registerConfirm');
    i.type  = i.type === 'password' ? 'text' : 'password';
  });
}

// ---- NAV USER STATE ----
function updateNavForUser() {
  const user = getSession();
  if (!user) return;

  const loginLink    = document.querySelector('a[href*="login.html"]');
  const registerLink = document.querySelector('a[href*="register.html"]');

  if (loginLink) {
    loginLink.textContent = user.name.split(' ')[0];
    loginLink.href = 'history.html';
  }
  if (registerLink) {
    registerLink.textContent = '📂 Histórico';
    registerLink.href = 'history.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initRegisterPage();
  updateNavForUser();
});
