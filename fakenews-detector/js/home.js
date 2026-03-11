// ============================================================
//  home.js — VeriFact: Carrossel de notícias na homepage
// ============================================================

const NEWS_CACHE_KEY = 'vf_news_v5';
const NEWS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas

let carouselNews    = [];
let carouselIdx     = 0;
let carouselTimer   = null;
let isAnimating     = false;

const catColors = {
  'Saúde':'#ff6b9d','Tecnologia':'#00d4ff','Política':'#a78bfa',
  'Economia':'#fbbf24','Ciência':'#34d399','Desporto':'#fb923c',
  'Fact-Check':'#f87171','Mundo':'#94a3b8'
};

// ── Proxy ─────────────────────────────────────────────────
function getProxyUrl() {
  const base = window.location.href.split('/fakenews-detector/')[0];
  return base + '/fakenews-detector/backend/core/news.php';
}

// ── Cache ─────────────────────────────────────────────────
function getCached() {
  try {
    const r = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY)||'null');
    return (r && Date.now()-r.ts < NEWS_CACHE_TTL) ? r.articles : null;
  } catch { return null; }
}
function setCache(a) {
  try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ts:Date.now(),articles:a})); } catch {}
}

// ── Normalizar artigo ─────────────────────────────────────
function normalize(a) {
  const ms  = Date.now() - new Date(a.publishedAt);
  const h   = Math.round(ms/3600000);
  const age = h<1?'Agora mesmo':h<24?'Há '+h+'h':h<48?'Ontem':'Há '+Math.round(h/24)+'d';
  const text = ((a.title||'')+(a.description||'')).toLowerCase();
  const cat =
    /saúde|médic|vírus|covid|vacin|cancer|hospital/.test(text)             ?'Saúde':
    /tecnolog|inteligência artificial|robot|software|hacker|cyber|ia /.test(text)?'Tecnologia':
    /polít|govern|eleição|parlamento|presidente|ministro/.test(text)       ?'Política':
    /economia|banco|euro|inflação|mercado|bolsa/.test(text)                ?'Economia':
    /ciência|estudo|investigação|descobert|universidade|espaço/.test(text) ?'Ciência':
    /desport|futebol|sport|jogo|campeonato/.test(text)                     ?'Desporto':
    /fake news|desinformação|fact.check|misinformation/.test(text)         ?'Fact-Check':'Mundo';
  return {
    title:a.title||'Sem título', source:a.source?.name||'Internacional',
    snippet:a.description||'', url:a.url||'#',
    image:a.urlToImage||null, date:age, category:cat
  };
}

// ── Render slide do carrossel ─────────────────────────────
function renderSlide(n, idx) {
  const enc   = encodeURIComponent(n.title.slice(0,200));
  const color = catColors[n.category]||'#94a3b8';
  const imgStyle = n.image
    ? 'background-image:url(\''+n.image+'\')'
    : 'background:linear-gradient(135deg,var(--surface2),var(--bg3))';

  return `<div class="carousel-slide" data-idx="${idx}">
    <div class="carousel-card" onclick="goToScan('${enc}')">
      <div class="carousel-card-img" style="${imgStyle}">
        ${!n.image?'<span class="carousel-card-placeholder-icon">'+n.category[0]+'</span>':''}
        <div class="carousel-card-overlay"></div>
        <div class="carousel-card-badge" style="background:${color}22;color:${color};border-color:${color}44">${n.category}</div>
        <div class="carousel-card-content">
          <div class="carousel-card-source">${n.source} · ${n.date}</div>
          <div class="carousel-card-title">${n.title}</div>
          ${n.snippet?'<div class="carousel-card-snippet">'+n.snippet.slice(0,140)+(n.snippet.length>140?'...':'')+'</div>':''}
          <div class="carousel-card-actions">
            ${n.url!=='#'?'<a href="'+n.url+'" target="_blank" class="carousel-btn-read" onclick="event.stopPropagation()">Ler artigo →</a>':''}
            <button class="carousel-btn-verify" onclick="event.stopPropagation();goToScan('${enc}')">🔍 Verificar</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Dots de navegação ─────────────────────────────────────
function buildDots() {
  const dotsEl = document.getElementById('carouselDots');
  if (!dotsEl) return;
  dotsEl.innerHTML = carouselNews.slice(0,10).map((_,i) =>
    `<button class="carousel-dot ${i===0?'active':''}" onclick="carouselGoTo(${i})"></button>`
  ).join('');
}

function updateDots(idx) {
  document.querySelectorAll('.carousel-dot').forEach((d,i) =>
    d.classList.toggle('active', i === idx % 10)
  );
}

// ── Navegação ─────────────────────────────────────────────
function carouselGoTo(idx, animate) {
  if (isAnimating) return;
  const track = document.getElementById('carouselTrack');
  if (!track || carouselNews.length === 0) return;

  isAnimating = true;
  const direction = (animate === 'prev') ? -1 : 1;

  // Fade out
  track.style.opacity = '0';
  track.style.transform = 'translateX('+(direction * -30)+'px)';

  setTimeout(() => {
    carouselIdx = ((idx % carouselNews.length) + carouselNews.length) % carouselNews.length;
    track.innerHTML = renderSlide(carouselNews[carouselIdx], carouselIdx);
    track.style.transition = 'none';
    track.style.opacity = '0';
    track.style.transform = 'translateX('+(direction * 30)+'px)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = 'opacity .4s ease, transform .4s ease';
        track.style.opacity = '1';
        track.style.transform = 'translateX(0)';
        updateDots(carouselIdx);
        isAnimating = false;
      });
    });
  }, 350);

  resetTimer();
}

function carouselMove(dir) {
  carouselGoTo(carouselIdx + dir, dir === -1 ? 'prev' : 'next');
}

// ── Auto-play ─────────────────────────────────────────────
function startTimer() {
  stopTimer();
  carouselTimer = setInterval(() => carouselGoTo(carouselIdx + 1, 'next'), 5000);
}
function stopTimer()  { if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; } }
function resetTimer() { startTimer(); }

// ── Init carrossel ────────────────────────────────────────
function initCarousel(news) {
  carouselNews = news;
  carouselIdx  = 0;

  const track = document.getElementById('carouselTrack');
  if (!track) return;
  track.innerHTML  = renderSlide(carouselNews[0], 0);
  track.style.opacity   = '0';
  track.style.transform = 'translateY(20px)';

  requestAnimationFrame(() => {
    track.style.transition = 'opacity .5s ease, transform .5s ease';
    track.style.opacity    = '1';
    track.style.transform  = 'translateY(0)';
  });

  buildDots();
  startTimer();

  // Pausar ao passar o rato
  const viewport = document.getElementById('carouselViewport');
  if (viewport) {
    viewport.addEventListener('mouseenter', stopTimer);
    viewport.addEventListener('mouseleave', startTimer);
    viewport.addEventListener('touchstart', stopTimer, {passive:true});
    viewport.addEventListener('touchend',   () => setTimeout(startTimer, 3000), {passive:true});
  }

  // Subtítulo
  const sub = document.getElementById('newsSubtitle');
  if (sub) {
    const now = new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    sub.textContent = news.length + ' notícias · Atualizado às ' + now;
  }
}

// ── Fetch ─────────────────────────────────────────────────
async function initNews() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;

  try {
    let raw = getCached();
    if (!raw) {
      const r    = await fetch(getProxyUrl(), {signal:AbortSignal.timeout(15000)});
      const data = await r.json();
      if (!data.success) throw new Error(data.error||'Erro API');
      raw = data.articles;
      setCache(raw);
    }
    const valid = raw
      .filter(a => a.title && a.title!=='[Removed]' && (a.source?.name||'')!=='[Removed]')
      .map(normalize);

    if (valid.length === 0) throw new Error('Sem artigos disponíveis');
    initCarousel(valid.slice(0, 20)); // máx 20 no carrossel homepage
  } catch(e) {
    console.warn('News error:', e.message);
    // Fallback com 1 card de erro
    track.innerHTML = `<div class="carousel-slide">
      <div class="carousel-card">
        <div class="carousel-card-img" style="background:linear-gradient(135deg,#1a1a2e,#0f0f1a)">
          <div class="carousel-card-overlay"></div>
          <div class="carousel-card-content" style="justify-content:center;text-align:center">
            <div style="font-size:48px;margin-bottom:12px">📡</div>
            <div class="carousel-card-title" style="font-size:18px">Notícias temporariamente indisponíveis</div>
            <div class="carousel-card-snippet">Verifica a tua ligação ou a chave da NewsAPI.</div>
            <button onclick="refreshNews()" class="carousel-btn-verify" style="margin:16px auto 0">🔄 Tentar novamente</button>
          </div>
        </div>
      </div>
    </div>`;
  }
}

async function refreshNews() {
  localStorage.removeItem(NEWS_CACHE_KEY);
  await initNews();
}

function goToScan(enc) {
  sessionStorage.setItem('vf_scan_text', decodeURIComponent(enc));
  window.location.href = 'pages/scan.html';
}

// ── DOMContentLoaded ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNews();

  // Quick scan bar
  const qBtn   = document.getElementById('quickScanBtn');
  const qInput = document.getElementById('quickInput');
  if (qBtn && qInput) {
    const go = () => {
      const v = qInput.value.trim();
      if (v) sessionStorage.setItem('vf_scan_text', v);
      window.location.href = 'pages/scan.html';
    };
    qBtn.addEventListener('click', go);
    qInput.addEventListener('keypress', e => { if (e.key==='Enter') go(); });
  }

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.style.borderBottomColor = window.scrollY>20 ? 'var(--border2)' : 'transparent';
    });
  }
});
