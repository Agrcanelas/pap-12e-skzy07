// ============================================================
//  auth.js — Sistema de autenticação VeriFact
//  Regra de ouro: vf_token + vf_user no localStorage = logado
// ============================================================

// ── 1. SESSÃO ────────────────────────────────────────────────
function VF_getUser() {
  try {
    const u = localStorage.getItem('vf_user');
    const t = localStorage.getItem('vf_token');
    if (!u || !t) return null;
    return JSON.parse(u);
  } catch { return null; }
}

function VF_setUser(user, token) {
  localStorage.setItem('vf_user',  JSON.stringify(user));
  localStorage.setItem('vf_token', token);
}

function VF_clearUser() {
  localStorage.removeItem('vf_user');
  localStorage.removeItem('vf_token');
}

function VF_isLoggedIn() {
  return !!(localStorage.getItem('vf_token') && localStorage.getItem('vf_user'));
}

// ── 2. HTTP ───────────────────────────────────────────────────
async function VF_request(endpoint, method, body) {
  const base  = window.location.href.split('/fakenews-detector/')[0] + '/fakenews-detector/backend/core';
  const token = localStorage.getItem('vf_token');
  const opts  = {
    method:  method || 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body)  opts.body = JSON.stringify(body);

  // Adicionar token também como query param (fallback para XAMPP que bloqueia Authorization header)
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = base + '/' + endpoint + (token ? sep + '_token=' + encodeURIComponent(token) : '');

  try {
    const r    = await fetch(url, opts);
    const json = await r.json();
    return { ok: r.ok, status: r.status, ...json };
  } catch (e) {
    return { ok: false, success: false, error: 'Sem ligação ao servidor.' };
  }
}

// ── 3. NAVBAR ────────────────────────────────────────────────
function VF_buildNavbar(active) {
  const inPages = window.location.pathname.includes('/pages/');
  const r       = inPages ? '' : 'pages/';
  const up      = inPages ? '../' : '';

  const user = VF_getUser();

  // Links base sempre visíveis
  let links = `
    <li><a href="${up}index.html"     class="nav-link ${active==='home'    ?'active':''}">Início</a></li>
    <li><a href="${r}scan.html"       class="nav-link ${active==='scan'    ?'active':''}">Verificar</a></li>
    <li><a href="${r}news.html"       class="nav-link ${active==='news'    ?'active':''}">Notícias</a></li>`;

  if (!user) {
    // Não logado
    links += `
    <li><a href="${r}login.html"    class="nav-link ${active==='login'   ?'active':''}">Entrar</a></li>
    <li><a href="${r}register.html" class="nav-link ${active==='register'?'active':''}">Registar</a></li>`;
  } else {
    // Logado — menu do utilizador
    const initial   = (user.name || '?')[0].toUpperCase();
    const avatarHtml = user.avatar
      ? '<img src="' + user.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
      : initial;
    links += `
    <li class="nav-user-menu" id="navUserMenu">
      <button class="nav-user-btn" onclick="VF_toggleMenu()">
        <div class="nav-avatar">${avatarHtml}</div>
        <span>${(user.name||'').split(' ')[0]}</span>
        <span class="nav-user-caret">▼</span>
      </button>
      <div class="nav-user-dropdown">
        <div class="nav-user-info">
          <div class="uname">${user.name||''}</div>
          <div class="uemail">${user.email||''}</div>
        </div>
        <a href="${r}profile.html"  class="nav-user-item">👤 Perfil</a>
        <a href="${r}history.html"  class="nav-user-item">📂 Histórico</a>
        <div class="nav-user-divider"></div>
        <button class="nav-user-item danger" onclick="VF_logout()">🚪 Sair</button>
      </div>
    </li>`;
  }

  // Mobile
  let mobile = user ? `
    <a href="${up}index.html">🏠 Início</a>
    <a href="${r}scan.html">🔍 Verificar</a>
    <a href="${r}news.html">📰 Notícias</a>
    <a href="${r}profile.html">👤 Perfil</a>
    <a href="${r}history.html">📂 Histórico</a>
    <a href="#" onclick="VF_logout();return false;" style="color:#ff5577">🚪 Sair</a>`
  : `
    <a href="${up}index.html">🏠 Início</a>
    <a href="${r}scan.html">🔍 Verificar</a>
    <a href="${r}news.html">📰 Notícias</a>
    <a href="${r}login.html">🔑 Entrar</a>
    <a href="${r}register.html">✨ Registar</a>`;

  const ul = document.querySelector('#navbar .nav-links');
  if (ul) ul.innerHTML = links;
  const mn = document.getElementById('mobileNav');
  if (mn) mn.innerHTML = mobile;

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', e => {
    const m = document.getElementById('navUserMenu');
    if (m && !m.contains(e.target)) m.classList.remove('open');
  });
}

function VF_toggleMenu() {
  document.getElementById('navUserMenu')?.classList.toggle('open');
}

async function VF_logout() {
  try { await VF_request('auth.php?action=logout', 'POST'); } catch {}
  VF_clearUser();
  window.location.href = window.location.pathname.includes('/pages/')
    ? '../index.html' : 'index.html';
}

// ── 4. TOAST ─────────────────────────────────────────────────
function VF_toast(msg, type) {
  let t = document.getElementById('vf-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'vf-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;pointer-events:none;transition:opacity .3s,transform .3s;opacity:0;transform:translateY(20px)';
    document.body.appendChild(t);
  }
  const bg = type==='success'?'#00c47a':type==='error'?'#ff3366':type==='warning'?'#f59e0b':'#00d4ff';
  t.style.cssText += ';background:' + bg + ';color:#000;opacity:1;transform:translateY(0)';
  t.textContent = msg;
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(20px)'; }, 3500);
}

// Alias para compatibilidade com scan.js que usa showToast
window.showToast = VF_toast;

// ── 5. PÁGINA DE LOGIN ────────────────────────────────────────
function VF_initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  // Se já logado, ir para home
  if (VF_isLoggedIn()) { window.location.href = '../index.html'; return; }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginError');
    const btn      = document.getElementById('loginBtn');

    errEl.classList.remove('show');
    if (!email || !password) {
      errEl.textContent = 'Preenche todos os campos.';
      errEl.classList.add('show'); return;
    }

    btn.disabled = true; btn.textContent = '⏳ A entrar...';

    const res = await VF_request('auth.php?action=login', 'POST', { email, password });

    if (res.success) {
      VF_setUser(res.data.user, res.data.token);
      btn.textContent = '✓ Sucesso!';
      setTimeout(() => { window.location.href = '../index.html'; }, 600);
    } else {
      errEl.textContent = res.error || 'Email ou palavra-passe incorretos.';
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });

  document.getElementById('togglePw')?.addEventListener('click', () => {
    const i = document.getElementById('loginPassword');
    i.type = i.type === 'password' ? 'text' : 'password';
  });
}

// ── 6. PÁGINA DE REGISTO ──────────────────────────────────────
function VF_initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  // Força de palavra-passe
  document.getElementById('registerPassword')?.addEventListener('input', function() {
    const pw = this.value;
    const segs  = document.querySelectorAll('.pw-strength-seg');
    const label = document.querySelector('.pw-strength-label');
    let s = 0;
    if (pw.length >= 6)           s++;
    if (pw.length >= 10)          s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    const lvls   = ['','Muito fraca','Fraca','Razoável','Boa','Forte'];
    const colors = ['','#ff3366','#ff6b35','#ffd700','#00d4ff','#00f5a0'];
    if (label) { label.textContent = lvls[s]||''; label.style.color = colors[s]; }
    segs.forEach((seg, i) => { seg.style.background = i < s ? colors[s] : 'var(--bg3)'; });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name     = document.getElementById('registerName').value.trim();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm  = document.getElementById('registerConfirm').value;
    const errEl    = document.getElementById('registerError');
    const succEl   = document.getElementById('registerSuccess');
    const btn      = document.getElementById('registerBtn');

    errEl.classList.remove('show'); succEl.classList.remove('show');

    if (!name || !email || !password || !confirm) {
      errEl.textContent = 'Preenche todos os campos.'; errEl.classList.add('show'); return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Palavra-passe com mínimo 6 caracteres.'; errEl.classList.add('show'); return;
    }
    if (password !== confirm) {
      errEl.textContent = 'As palavras-passe não coincidem.'; errEl.classList.add('show'); return;
    }

    btn.disabled = true; btn.textContent = '⏳ A criar conta...';

    const res = await VF_request('auth.php?action=register', 'POST', { name, email, password });

    if (res.success) {
      VF_setUser(res.data.user, res.data.token);
      succEl.textContent = '✓ Conta criada! Bem-vindo, ' + name + '!';
      succEl.classList.add('show');
      btn.textContent = '✓ Sucesso!';
      setTimeout(() => { window.location.href = '../index.html'; }, 900);
    } else {
      errEl.textContent = res.error || 'Erro ao criar conta.';
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = 'Criar Conta';
    }
  });

  document.getElementById('togglePw')?.addEventListener('click', () => {
    const i = document.getElementById('registerPassword'); i.type = i.type==='password'?'text':'password';
  });
  document.getElementById('togglePw2')?.addEventListener('click', () => {
    const i = document.getElementById('registerConfirm'); i.type = i.type==='password'?'text':'password';
  });
}

// ── 7. PÁGINA DE PERFIL ───────────────────────────────────────
function VF_initProfile() {
  if (!document.getElementById('profileWrap')) return;

  // Redirecionar se não logado
  if (!VF_isLoggedIn()) { window.location.href = 'login.html'; return; }

  let user = VF_getUser();

  // Preencher campos
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || ''; };

  function fillProfile(u) {
    setVal('profName',  u.name);
    setVal('profEmail', u.email);
    setVal('profBio',   u.bio || '');
    setText('profHeaderName',  u.name);
    setText('profHeaderEmail', u.email);
    const prev = document.getElementById('profAvatarPreview');
    if (prev) {
      prev.innerHTML = u.avatar
        ? '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
        : (u.name||'?')[0].toUpperCase();
    }
  }

  // Preencher com dados locais imediatamente
  fillProfile(user);

  // Buscar dados frescos do servidor
  VF_request('auth.php?action=me', 'GET').then(fresh => {
    if (fresh && fresh.success && fresh.data) {
      user = { ...user, ...fresh.data };
      VF_setUser(user, localStorage.getItem('vf_token'));
      fillProfile(user);
    }
  }).catch(() => {});

  // Avatar
  const prev = document.getElementById('profAvatarPreview');
  if (prev) {
    prev.innerHTML = user.avatar
      ? '<img src="' + user.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>'
      : (user.name||'?')[0].toUpperCase();
  }

  // Upload avatar
  document.getElementById('avatarInput')?.addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2*1024*1024) { VF_toast('Imagem demasiado grande (máx 2MB)', 'error'); return; }
    const fr = new FileReader();
    fr.onload = ev => {
      if (prev) prev.innerHTML = '<img src="' + ev.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
      const inp = document.getElementById('profAvatarData');
      if (inp) inp.value = ev.target.result;
    };
    fr.readAsDataURL(file);
  });

  // Guardar perfil
  document.getElementById('profSaveBtn')?.addEventListener('click', async () => {
    const name   = (document.getElementById('profName')?.value || '').trim();
    const bio    = (document.getElementById('profBio')?.value  || '').trim();
    const avatar = document.getElementById('profAvatarData')?.value || user.avatar || null;
    if (!name) { VF_toast('O nome não pode estar vazio.', 'error'); return; }

    const res = await VF_request('auth.php?action=update', 'POST', { name, bio, avatar });
    if (res.success) {
      VF_setUser({ ...user, name, bio, avatar }, localStorage.getItem('vf_token'));
      VF_toast('✓ Perfil atualizado!', 'success');
      setText('profHeaderName', name);
    } else {
      VF_toast(res.error || 'Erro ao guardar.', 'error');
    }
  });

  // Alterar palavra-passe
  document.getElementById('profPwBtn')?.addEventListener('click', async () => {
    const cur  = document.getElementById('profPwCurrent')?.value || '';
    const novo = document.getElementById('profPwNew')?.value     || '';
    const conf = document.getElementById('profPwConfirm')?.value || '';
    const errEl = document.getElementById('profPwError');
    if (errEl) errEl.textContent = '';

    if (!cur || !novo || !conf) { if (errEl) errEl.textContent = 'Preenche todos os campos.'; return; }
    if (novo.length < 6)        { if (errEl) errEl.textContent = 'Mínimo 6 caracteres.'; return; }
    if (novo !== conf)          { if (errEl) errEl.textContent = 'As palavras-passe não coincidem.'; return; }

    const res = await VF_request('auth.php?action=changePassword', 'POST', { current_password: cur, new_password: novo });
    if (res.success) {
      VF_toast('✓ Palavra-passe alterada!', 'success');
      ['profPwCurrent','profPwNew','profPwConfirm'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    } else {
      if (errEl) errEl.textContent = res.error || 'Palavra-passe atual incorreta.';
    }
  });

  // Apagar conta
  document.getElementById('profDeleteBtn')?.addEventListener('click', async () => {
    if (!confirm('Tens a certeza? Esta ação é irreversível.')) return;
    await VF_request('auth.php?action=delete', 'DELETE');
    VF_clearUser();
    window.location.href = '../index.html';
  });

  // Estatísticas
  VF_request('scans.php?action=stats').then(res => {
    if (!res.success) return;
    const d = res.data;
    ['statTotal','statFake','statReal','statSusp'].forEach((id, i) => {
      const el = document.getElementById(id);
      const val = [d.total, d.fake_count, d.real_count, d.suspicious_count][i];
      if (el) el.textContent = val ?? 0;
    });
  }).catch(() => {});

  // Emoji avatares
  const EMOJIS = ['🧑‍💻','👨‍🔬','👩‍🔬','🕵️','🦸','🧙','🦊','🐺','🦁','🐉','🤖','👾'];
  const grid = document.getElementById('emojiAvatarGrid');
  if (grid) {
    EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'avatar-opt'; btn.textContent = emoji;
      btn.onclick = () => {
        document.querySelectorAll('.avatar-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#00f5a0';
        ctx.beginPath(); ctx.arc(64,64,64,0,Math.PI*2); ctx.fill();
        ctx.font = '80px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 70);
        const url = c.toDataURL();
        const inp = document.getElementById('profAvatarData'); if (inp) inp.value = url;
        if (prev) prev.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>';
      };
      grid.appendChild(btn);
    });
  }
}

// ── 8. PÁGINA DE HISTÓRICO ────────────────────────────────────
function VF_initHistory() {
  if (!document.getElementById('scanList') && !document.getElementById('scansEmpty')) return;
  if (!VF_isLoggedIn()) { window.location.href = 'login.html'; return; }
}

// ── 9. INIT GERAL (corre em todas as páginas) ─────────────────
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const page =
    path.includes('scan.html')     ? 'scan'     :
    path.includes('login.html')    ? 'login'    :
    path.includes('register.html') ? 'register' :
    path.includes('history.html')  ? 'history'  :
    path.includes('profile.html')  ? 'profile'  :
    path.includes('news.html')     ? 'news'     : 'home';

  VF_buildNavbar(page);

  if (page === 'login')    VF_initLogin();
  if (page === 'register') VF_initRegister();
  if (page === 'profile')  VF_initProfile();
  if (page === 'history')  VF_initHistory();
});

// ============================================================
// ── Google Login ─────────────────────────────────────────────
// ============================================================
async function handleGoogleLogin(response) {
  const idToken = response.credential;
  if (!idToken) { VF_toast('Erro ao obter token Google.', 'error'); return; }

  try {
    const base = window.location.href.split('/fakenews-detector/')[0] + '/fakenews-detector/backend/core';
    const res  = await fetch(base + '/auth.php?action=googleLogin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id_token: idToken })
    });
    const data = await res.json();

    if (data.success && data.data?.token) {
      VF_setUser(data.data.user, data.data.token);
      VF_toast('✓ Login com Google efetuado!', 'success');
      setTimeout(() => { window.location.href = '../index.html'; }, 600);
    } else {
      VF_toast(data.error || 'Erro no login com Google.', 'error');
    }
  } catch(e) {
    VF_toast('Erro de ligação ao servidor.', 'error');
  }
}

// Botão Google manual (trigger)
document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleLoginBtn') || document.getElementById('googleRegisterBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      // Trigger Google One Tap
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        VF_toast('Google Sign-In não carregado. Tenta novamente.', 'error');
      }
    });
  }
});
