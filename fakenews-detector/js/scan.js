// ============================================================
//  scan.js — VeriFact: Google Fact Check API + Gemini AI
// ============================================================

const GEMINI_API_KEY = 'AIzaSyAbMJvMkyz7TPv-NyihN9CiN9mD-g_2Dh4';
const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
const FACTCHECK_KEY  = 'AIzaSyCUQZ5pI7bhQL8dwIxgPD8KfofnbF6ZNLc';
const FACTCHECK_URL  = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

let currentMode = 'text';
let lastResult  = null;

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, type) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;pointer-events:none;transition:opacity .4s,transform .4s;opacity:0;transform:translateY(20px)';
    document.body.appendChild(t);
  }
  const bg = type==='success'?'#00c47a':type==='error'?'#ff3366':type==='warning'?'#f59e0b':'#00d4ff';
  t.style.background=bg; t.style.color='#000'; t.textContent=msg;
  t.style.opacity='1'; t.style.transform='translateY(0)';
  clearTimeout(t._to);
  t._to = setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(20px)'; }, 4000);
}

// ── Tab ────────────────────────────────────────────────────
function switchTab(mode) {
  currentMode = mode;
  document.getElementById('tabText').classList.toggle('active', mode==='text');
  document.getElementById('tabUrl').classList.toggle('active',  mode==='url');
  document.getElementById('panelText').style.display = mode==='text'?'block':'none';
  document.getElementById('panelUrl').style.display  = mode==='url' ?'block':'none';
}

// ── Progress ───────────────────────────────────────────────
function setStep(i, status, text) {
  const el = document.getElementById('step-'+i);
  if (!el) return;
  el.className = 'step-item '+status;
  const s = el.querySelector('.step-status'); if (s) s.textContent = text||'';
  const d = el.querySelector('.step-dot');
  if (d) d.textContent = status==='done'?'✓':status==='error'?'✗':['📥','🤖','🌐','🔍','⚖️','📄'][i]||'●';
}
function setProgress(pct, text) {
  const f = document.getElementById('progressFill');      if (f) f.style.width = pct+'%';
  const s = document.getElementById('progressStatus');    if (s) s.textContent = text||'';
  const p = document.getElementById('progressPct');       if (p) p.textContent = pct+'%';
}
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

// ── Obter conteúdo de URL ──────────────────────────────────
async function fetchUrlContent(url) {
  // Tentar extrair domínio/título do URL como fallback
  const urlObj   = (() => { try { return new URL(url); } catch { return null; } })();
  const domain   = urlObj?.hostname?.replace('www.','') || url;
  const pathHint = urlObj?.pathname?.split('/').filter(Boolean).join(' ') || '';

  const proxies = [
    { url: 'https://api.allorigins.win/get?url='+encodeURIComponent(url), json: true },
    { url: 'https://corsproxy.io/?'+encodeURIComponent(url),              json: false },
    { url: 'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(url), json: false },
    { url: 'https://thingproxy.freeboard.io/fetch/'+encodeURIComponent(url),   json: false },
  ];

  for (const proxy of proxies) {
    try {
      console.log('🔄 A tentar proxy:', proxy.url.split('?')[0]);
      const r = await fetch(proxy.url, { signal: AbortSignal.timeout(10000) });
      console.log('📡 Resposta proxy:', r.status, r.ok);
      if (!r.ok) continue;
      let html = '';
      if (proxy.json) {
        const json = await r.json().catch(()=>null);
        html = json?.contents || '';
      } else {
        html = await r.text().catch(()=>'');
      }
      if (!html || html.length < 100) continue;

      const div = document.createElement('div');
      div.innerHTML = html;
      ['script','style','nav','footer','header','aside','iframe','noscript'].forEach(tag=>
        div.querySelectorAll(tag).forEach(el=>el.remove()));

      // Tentar extrair meta description e title como contexto
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || '';
      const metaTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
      const ogTitle   = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] || '';
      const ogDesc    = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] || '';

      const bodyText  = (div.innerText||div.textContent||'').replace(/\s+/g,' ').trim().slice(0,2500);
      const metaText  = [ogTitle||metaTitle, ogDesc||metaDesc].filter(Boolean).join('. ');
      const combined  = (metaText + ' ' + bodyText).trim();

      if (combined.length > 80) return combined.slice(0,3000);
    } catch(e) { continue; }
  }

  // Último fallback: usar o URL e domínio como contexto para a IA
  const hint = [domain, pathHint].filter(Boolean).join(' — ').replace(/-|_/g,' ');
  if (hint.length > 10) {
    return `[Conteúdo do URL não foi possível obter diretamente. URL: ${url}. Domínio: ${domain}. Contexto da URL: ${hint}. Analisa com base nesta informação.]`;
  }

  throw new Error('Não foi possível obter o conteúdo do URL. Tenta colar o texto diretamente.');
}

// ── HELPER: Chamar Gemini ──────────────────────────────────
async function callGemini(prompt, maxTokens) {
  const r = await fetch(GEMINI_URL + '?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens || 600,
        temperature: 0.1,
      }
    })
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error('Gemini API erro (' + r.status + '): ' + (err?.error?.message || r.statusText));
  }
  const data = await r.json();
  if (data.error) throw new Error('Gemini: ' + data.error.message);
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim();
}

// ── PASSO 1: Validar se é notícia ─────────────────────────
async function validateIsNews(text) {
  const prompt = `Analyze the following text and respond ONLY with valid JSON, no markdown, no explanation.

Text: "${text.slice(0, 400)}"

Return this exact JSON structure:
{"is_news":true,"reason":"short reason","topic":"3 word topic","language":"pt"}

Rules:
- Set is_news to false ONLY if the text is: obvious fiction, poetry, source code, recipe, or completely nonsensical (like "aaa", "test123").
- Set is_news to true for: news headlines, political claims, scientific claims, social media posts about events, any verifiable statement.
- When in doubt, set is_news to true.`;

  try {
    const raw = await callGemini(prompt, 200);
    // Extrair primeiro bloco JSON da resposta (mesmo que venha com texto à volta)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    const parsed    = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    // Normalizar is_news — pode vir como boolean, string "true"/"false", ou número
    const rawVal = parsed.is_news ?? parsed.isNews ?? true;
    const isNews = rawVal === true || rawVal === 'true' || rawVal === 1;
    return { is_news: isNews, reason: parsed.reason || '', topic: parsed.topic || '', language: parsed.language || 'pt' };
  } catch {
    // Em caso de qualquer erro, assume que é notícia para não bloquear análises legítimas
    return { is_news: true, reason: 'Validação indisponível', topic: '', language: 'pt' };
  }
}

// ── PASSO 2: Google Fact Check API ────────────────────────
async function searchFactCheck(query) {
  try {
    // Tentar em português primeiro, depois inglês
    const tryLang = async (lang) => {
      const url = FACTCHECK_URL+'?key='+FACTCHECK_KEY
        +'&query='+encodeURIComponent(query.slice(0,200))
        +'&languageCode='+lang+'&pageSize=5';
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      const data = await r.json();
      return (data.claims||[]).map(c=>({
        text:      c.text||'',
        claimant:  c.claimant||'',
        rating:    c.claimReview?.[0]?.textualRating||'',
        url:       c.claimReview?.[0]?.url||'',
        publisher: c.claimReview?.[0]?.publisher?.name||'',
      }));
    };
    const pt = await tryLang('pt');
    if (pt.length > 0) return pt;
    return await tryLang('en');
  } catch { return []; }
}

// ── PASSO 3: Gemini análise final ─────────────────────────
async function analyzeWithGemini(text, factChecks) {
  const fcContext = factChecks.length > 0
    ? '\n\nVERIFICAÇÕES REAIS ENCONTRADAS:\n' + factChecks.map((f,i) =>
        '['+(i+1)+'] "'+f.text.slice(0,150)+'"\n  Veredicto: '+f.rating+' | Fonte: '+f.publisher).join('\n')
    : '\n\nNota: Não há verificações anteriores desta notícia em bases de dados de fact-checking.';

  const prompt = `És um verificador de factos rigoroso português. Analisa a notícia abaixo.

NOTÍCIA: "${text.slice(0,1500)}"
${fcContext}

REGRAS:
- Se há fact-checks, dá muito peso a esses veredictos oficiais
- Analisa linguagem alarmista, contradições, ausência de fontes
- Se não tens certeza, usa "suspicious"
- Responde APENAS em JSON válido sem markdown:

{"verdict":"fake"/"real"/"suspicious","reliability":0-100,"confidence":0-100,"summary":"análise em 2-3 frases em português","what_is_true":"o que é verdade ou vazio","verdict_reason":"razão em 1 frase","indicators":["indicador1","indicador2","indicador3"]}`;

  const raw = await callGemini(prompt, 700);
  try {
    const p = JSON.parse(raw);
    return {
      verdict:        ['fake','real','suspicious'].includes(p.verdict) ? p.verdict : 'suspicious',
      reliability:    Math.min(99, Math.max(1,  p.reliability || 50)),
      confidence:     Math.min(99, Math.max(20, p.confidence  || 50)),
      summary:        p.summary        || 'Análise concluída.',
      what_is_true:   p.what_is_true   || '',
      verdict_reason: p.verdict_reason || '',
      indicators:     Array.isArray(p.indicators) ? p.indicators : [],
    };
  } catch { throw new Error('Resposta da IA inválida. Tenta novamente.'); }
}

// ── Helpers de UI ──────────────────────────────────────────
const verdictLabel = v => v==='fake'?'FALSO':v==='real'?'VERDADEIRO':'SUSPEITO';
const verdictColor = v => v==='fake'?'#ff3366':v==='real'?'#00f5a0':'#ffd700';
const verdictEmoji = v => v==='fake'?'❌':v==='real'?'✅':'⚠️';

// ── Mostrar "não é notícia" ────────────────────────────────
function showNotNewsResult(reason) {
  const s = document.getElementById('resultSection');
  s.innerHTML = `
    <div style="text-align:center;padding:48px 24px">
      <div style="font-size:64px;margin-bottom:16px">🤔</div>
      <div style="font-family:var(--font-display,monospace);font-size:28px;letter-spacing:2px;color:var(--accent2,#00d4ff);margin-bottom:12px">NÃO É UMA NOTÍCIA</div>
      <div style="color:var(--text2,#aaa);font-size:15px;max-width:480px;margin:0 auto 24px">${reason||'O texto não parece ser uma notícia ou afirmação factual verificável.'}</div>
      <div style="background:var(--surface,#1a1a2e);border:1px solid var(--border,#333);border-radius:12px;padding:20px;max-width:480px;margin:0 auto;color:var(--text3,#888);font-size:13px;line-height:1.8">
        💡 O VeriFact analisa notícias, titulares e afirmações factuais.<br>
        <strong style="color:var(--text,#eee)">Exemplos:</strong><br>
        <em>"Portugal vai abandonar o Euro em 2025"</em><br>
        <em>"Cientistas descobriram cura para o cancro"</em>
      </div>
      <button onclick="resetScan()" style="margin-top:24px;background:var(--accent,#00f5a0);color:#000;border:none;border-radius:10px;padding:12px 32px;font-size:14px;font-weight:700;cursor:pointer">🔄 Tentar Novamente</button>
    </div>`;
  s.classList.add('active');
  s.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── Mostrar resultado ──────────────────────────────────────
function showResult(result, factChecks) {
  const s     = document.getElementById('resultSection');
  const color = verdictColor(result.verdict);
  const pct   = result.reliability;

  const fcHtml = factChecks.length > 0 ? `
    <div style="margin-top:24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3,#888);margin-bottom:12px">🔍 Verificações por Fontes Reais</div>
      ${factChecks.map(f=>`
        <div style="background:var(--surface2,#111);border:1px solid var(--border,#333);border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="font-size:13px;color:var(--text,#eee);margin-bottom:8px">"${f.text.slice(0,130)}${f.text.length>130?'...':''}"</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--surface,#1a1a2e);border:1px solid var(--border,#333);color:var(--accent2,#00d4ff)">${f.rating||'Verificado'}</span>
            <span style="font-size:11px;color:var(--text3,#888)">por ${f.publisher}</span>
            ${f.url?'<a href="'+f.url+'" target="_blank" style="font-size:11px;color:var(--accent,#00f5a0);margin-left:auto;text-decoration:none">Ver fonte →</a>':''}
          </div>
        </div>`).join('')}
    </div>` : `
    <div style="margin-top:24px;padding:14px 16px;background:var(--surface2,#111);border:1px solid var(--border,#333);border-radius:10px;font-size:13px;color:var(--text3,#888)">
      ℹ️ Notícia não encontrada em bases de dados de fact-checking. Análise baseada exclusivamente em IA.
    </div>`;

  const indHtml = result.indicators.length > 0 ? `
    <div style="margin-top:24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3,#888);margin-bottom:12px">🧩 Indicadores Encontrados</div>
      ${result.indicators.map(ind=>`
        <div style="display:flex;gap:10px;font-size:13px;color:var(--text2,#ccc);padding:8px 0;border-bottom:1px solid var(--border,#222)">
          <span style="color:${color};flex-shrink:0">◆</span><span>${ind}</span>
        </div>`).join('')}
    </div>` : '';

  s.innerHTML = `
    <div style="padding:32px 24px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:56px;margin-bottom:12px">${verdictEmoji(result.verdict)}</div>
        <div style="font-family:var(--font-display,monospace);font-size:clamp(28px,6vw,48px);letter-spacing:3px;color:${color};margin-bottom:8px">${verdictLabel(result.verdict)}</div>
        ${result.verdict_reason?'<div style="color:var(--text2,#aaa);font-size:14px;max-width:500px;margin:0 auto">'+result.verdict_reason+'</div>':''}
      </div>

      <div style="background:var(--surface,#1a1a2e);border:1px solid var(--border,#333);border-radius:14px;padding:20px 24px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3,#888)">Índice de Fiabilidade</span>
          <span style="font-family:var(--font-display,monospace);font-size:28px;color:${color}">${pct}%</span>
        </div>
        <div style="background:var(--surface2,#111);border-radius:999px;height:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:999px;transition:width 1.2s ease"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text3,#888)">
          <span>Falso</span><span>Suspeito</span><span>Verdadeiro</span>
        </div>
      </div>

      <div style="background:var(--surface,#1a1a2e);border:1px solid var(--border,#333);border-radius:14px;padding:20px 24px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3,#888);margin-bottom:10px">📋 Resumo da Análise</div>
        <p style="color:var(--text,#eee);font-size:14px;line-height:1.7;margin:0">${result.summary}</p>
        ${result.what_is_true?'<div style="margin-top:12px;padding:10px 14px;background:rgba(0,245,160,0.08);border-left:3px solid #00f5a0;border-radius:4px;font-size:13px;color:var(--text2,#ccc)"><strong style="color:#00f5a0">O que é verdade:</strong> '+result.what_is_true+'</div>':''}
      </div>

      ${fcHtml}
      ${indHtml}

      <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap">
        <button id="downloadPdfBtn" style="flex:1;min-width:140px;background:var(--accent,#00f5a0);color:#000;border:none;border-radius:10px;padding:13px 20px;font-size:14px;font-weight:700;cursor:pointer">📄 Descarregar PDF</button>
        <button onclick="resetScan()" style="flex:1;min-width:140px;background:var(--surface,#1a1a2e);color:var(--text,#eee);border:1px solid var(--border,#333);border-radius:10px;padding:13px 20px;font-size:14px;font-weight:600;cursor:pointer">🔄 Nova Verificação</button>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--text3,#888);text-align:center">
        Confiança da IA: ${result.confidence}% · Fontes verificadas: ${factChecks.length}
      </div>
    </div>`;

  document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);
  s.classList.add('active');
  s.scrollIntoView({ behavior:'smooth', block:'start' });
  document.getElementById('scanBtn').disabled = false;
}

// ── Reset ─────────────────────────────────────────────────
function resetScan() {
  const nt = document.getElementById('newsText'); if (nt) nt.value='';
  const nu = document.getElementById('newsUrl');  if (nu) nu.value='';
  const cc = document.getElementById('charCount');if (cc) cc.textContent='0';
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('progressSection').classList.remove('active');
  lastResult = null;
  window.scrollTo({ top:0, behavior:'smooth' });
}

// ── Gerar PDF Profissional ────────────────────────────────
async function generatePDF() {
  if (!lastResult) return;
  if (typeof VF_isLoggedIn==='function' && !VF_isLoggedIn()) {
    showToast('Tens de fazer login para descarregar o PDF.','error');
    setTimeout(()=>{ if(confirm('Fazer login agora?')) window.location.href='login.html'; },500);
    return;
  }
  try {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W=210, H=297, m=16, cw=W-m*2;
    let y=0, page=1;

    // ── Paleta ──────────────────────────────────────────────
    const C = {
      bg:      [8,8,16],
      surface: [18,18,30],
      card:    [24,24,38],
      border:  [40,40,60],
      accent:  [0,220,140],
      blue:    [0,180,230],
      fake:    [220,50,80],
      susp:    [220,170,0],
      real:    [0,210,130],
      white:   [255,255,255],
      g1:      [210,210,225],
      g2:      [150,150,170],
      g3:      [90,90,110],
    };

    const vColor = lastResult.verdict==='fake' ? C.fake :
                   lastResult.verdict==='real' ? C.real : C.susp;
    const vLabel = verdictLabel(lastResult.verdict);
    const rel    = lastResult.reliability || 50;
    const now    = new Date();
    const dateStr= now.toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const timeStr= now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    const user   = (typeof VF_getUser==='function') ? VF_getUser() : null;
    const reportId = 'VF-'+now.getFullYear()+'-'+Date.now().toString(36).toUpperCase().slice(-6);

    // ═══════════════════════════════════════════════
    // HELPER: nova página se necessário
    // ═══════════════════════════════════════════════
    function checkPage(need) {
      if (y + need > H - 24) {
        addFooter(page);
        doc.addPage();
        page++;
        addHeader();
      }
    }

    // ═══════════════════════════════════════════════
    // HEADER — compacto e elegante
    // ═══════════════════════════════════════════════
    function addHeader() {
      const hH = 36;

      // Fundo escuro
      doc.setFillColor(...C.bg);
      doc.rect(0, 0, W, hH, 'F');

      // Barra accent esquerda fina
      doc.setFillColor(...C.accent);
      doc.rect(0, 0, 3, hH, 'F');

      // Logo — VERI
      doc.setFont('helvetica','bold');
      doc.setFontSize(18);
      doc.setTextColor(...C.accent);
      doc.text('VERI', m, 14);
      const vw = doc.getTextWidth('VERI');

      // Logo — FACT
      doc.setTextColor(...C.white);
      doc.text('FACT', m + vw, 14);

      // Subtítulo
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.g3);
      doc.text('RELATORIO DE VERIFICACAO DE FACTOS  |  verifact.fwh.is', m, 21);

      // Linha separadora fina
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(m, 26, W - m, 26);

      // Info direita — ID e data na mesma linha
      doc.setFont('helvetica','bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.g3);
      doc.text('ID', W - m - 80, 14, { align:'left' });
      doc.text('DATA', W - m - 30, 14, { align:'left' });

      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.blue);
      doc.text(reportId, W - m - 80, 20);
      doc.setTextColor(...C.g2);
      doc.text(dateStr, W - m - 30, 20);

      // Utilizador
      if (user) {
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.g3);
        doc.text('Utilizador: ' + (user.name||user.email||''), m, 32);
      }
      doc.setTextColor(...C.g3);
      doc.text(timeStr, W - m, 32, { align:'right' });

      // Linha fina accent em baixo do header
      doc.setFillColor(...C.accent);
      doc.rect(0, hH - 1, W, 1, 'F');

      y = hH + 8;
    }

    // ═══════════════════════════════════════════════
    // FOOTER — profissional
    // ═══════════════════════════════════════════════
    function addFooter(pg) {
      const fy = H - 14;
      doc.setFillColor(...C.bg);
      doc.rect(0, fy, W, 14, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(m, fy, W - m, fy);

      doc.setFont('helvetica','normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...C.g3);
      doc.text('VeriFact — Detector de Fake News com Inteligencia Artificial | Projeto PAP', m, fy + 5);
      doc.text('Este relatorio foi gerado automaticamente e deve ser usado apenas como referencia informativa.', m, fy + 9.5);

      const total = doc.getNumberOfPages();
      doc.setTextColor(...C.blue);
      doc.text('Pagina ' + pg + ' de ' + total, W - m, fy + 5, { align:'right' });
      doc.setTextColor(...C.g3);
      doc.text('verifact.fwh.is', W - m, fy + 9.5, { align:'right' });
    }

    // ═══════════════════════════════════════════════
    // SECTION TITLE — linha accent + texto
    // ═══════════════════════════════════════════════
    function sectionTitle(title) {
      checkPage(14);
      y += 2;
      // Linha accent
      doc.setFillColor(...C.accent);
      doc.rect(m, y, 2, 8, 'F');
      // Título
      doc.setFont('helvetica','bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.accent);
      doc.text(title.toUpperCase(), m + 6, y + 6);
      // Linha horizontal fina
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      const tw = doc.getTextWidth(title.toUpperCase());
      doc.line(m + 8 + tw, y + 4, W - m, y + 4);
      y += 14;
    }

    // ═══════════════════════════════════════════════
    // TEXT BLOCK
    // ═══════════════════════════════════════════════
    function textBlock(text, size, color, bold, indent, lh) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, cw - (indent||0));
      const lineH = lh || size * 0.44;
      checkPage(lines.length * lineH + 3);
      doc.text(lines, m + (indent||0), y);
      y += lines.length * lineH + 3;
    }

    // ═══════════════════════════════════════════════
    // INFO ROW — com fundo alternado
    // ═══════════════════════════════════════════════
    function infoRow(label, value, vCol, rowIdx) {
      checkPage(8);
      const rowH = 7;
      if (rowIdx % 2 === 0) {
        doc.setFillColor(20, 20, 34);
        doc.rect(m, y - 1.5, cw, rowH, 'F');
      }
      doc.setFont('helvetica','bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.g3);
      doc.text(label, m + 3, y + 3.5);

      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(...(vCol || C.g1));
      const vlines = doc.splitTextToSize(String(value||'—'), cw - 55);
      doc.text(vlines, m + 52, y + 3.5);
      y += Math.max(rowH, vlines.length * 4.5);
    }

    // ═══════════════════════════════════════════════════════
    //  PÁGINA 1 — INÍCIO
    // ═══════════════════════════════════════════════════════
    addHeader();

    // ── 1. BLOCO VEREDICTO ──────────────────────────────
    checkPage(42);

    // Fundo do card veredicto
    doc.setFillColor(...C.card);
    doc.roundedRect(m, y, cw, 38, 3, 3, 'F');

    // Barra lateral colorida
    doc.setFillColor(...vColor);
    doc.roundedRect(m, y, 4, 38, 2, 2, 'F');

    // Veredicto texto grande
    doc.setFont('helvetica','bold');
    doc.setFontSize(22);
    doc.setTextColor(...vColor);
    doc.text(vLabel, m + 12, y + 16);

    // Razão do veredicto
    if (lastResult.verdict_reason) {
      doc.setFont('helvetica','normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.g2);
      const rLines = doc.splitTextToSize(lastResult.verdict_reason, cw - 80);
      doc.text(rLines, m + 12, y + 24);
    }

    // Fiabilidade lado direito
    doc.setFont('helvetica','bold');
    doc.setFontSize(26);
    doc.setTextColor(...vColor);
    doc.text(rel + '%', W - m - 8, y + 18, { align:'right' });

    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.g3);
    doc.text('INDICE DE FIABILIDADE', W - m - 8, y + 26, { align:'right' });

    y += 44;

    // ── 2. BARRA DE FIABILIDADE ──────────────────────────
    checkPage(20);

    // Fundo
    doc.setFillColor(...C.card);
    doc.roundedRect(m, y, cw, 14, 2, 2, 'F');

    // Barra preenchimento
    const barW = Math.max(4, cw * rel / 100);
    doc.setFillColor(...vColor);
    doc.roundedRect(m, y, barW, 14, 2, 2, 'F');

    // Marcador percentagem
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(0,0,0);
    const markerX = m + barW - 1;
    doc.text(rel + '%', Math.min(markerX, W - m - 14), y + 9.5);

    // Labels
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.g3);
    doc.text('Falso', m, y + 20);
    doc.text('Suspeito', m + cw/2, y + 20, { align:'center' });
    doc.text('Verdadeiro', m + cw, y + 20, { align:'right' });

    // Marcadores
    doc.setFillColor(...C.g3);
    [m, m+cw/2, m+cw].forEach(x => doc.circle(x, y + 14, 0.7, 'F'));

    y += 28;

    // ── 3. INFORMAÇÕES DA ANÁLISE ───────────────────────
    sectionTitle('Informacoes da Analise');

    const rows = [
      ['Data e Hora',      dateStr + ' às ' + timeStr,          C.g1],
      ['ID do Relatorio',  reportId,                             C.blue],
      ['Veredicto',        vLabel + ' (' + rel + '% fiavel)',   vColor],
      ['Confianca da IA',  (lastResult.confidence||'N/D') + '%', C.g1],
    ];
    if (user) rows.push(['Utilizador', user.name||user.email||'', C.g1]);

    rows.forEach(([lbl, val, col], i) => infoRow(lbl, val, col, i));
    y += 8;

    // ── 4. CONTEÚDO ANALISADO ───────────────────────────
    sectionTitle('Conteudo Analisado');

    const inputTxt = (lastResult.inputText||'').slice(0, 500);
    const iLines   = doc.splitTextToSize(inputTxt + (lastResult.inputText?.length > 500 ? '...' : ''), cw - 10);
    const iH       = Math.max(16, iLines.length * 4.8 + 10);
    checkPage(iH + 4);

    doc.setFillColor(...C.card);
    doc.roundedRect(m, y, cw, iH, 3, 3, 'F');
    doc.setFillColor(...C.blue);
    doc.rect(m, y, 2, iH, 'F');

    doc.setFont('helvetica','italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.g1);
    doc.text(iLines, m + 7, y + 6);
    y += iH + 10;

    // ── 5. RESUMO DA IA ─────────────────────────────────
    sectionTitle('Analise da Inteligencia Artificial');

    const sumLines = doc.splitTextToSize(lastResult.summary||'Sem resumo.', cw - 6);
    const sumH     = sumLines.length * 5 + 12;
    checkPage(sumH + 4);

    doc.setFillColor(...C.card);
    doc.roundedRect(m, y, cw, sumH, 3, 3, 'F');

    doc.setFont('helvetica','normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.g1);
    doc.text(sumLines, m + 5, y + 8);
    y += sumH + 8;

    // O que é verdade
    if (lastResult.what_is_true) {
      checkPage(18);
      const wtLines = doc.splitTextToSize(lastResult.what_is_true, cw - 18);
      const wtH     = wtLines.length * 4.5 + 10;
      doc.setFillColor(0, 40, 26);
      doc.roundedRect(m, y, cw, wtH, 2, 2, 'F');
      doc.setFillColor(...C.real);
      doc.rect(m, y, 2, wtH, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.real);
      doc.text('O QUE E VERDADE:', m + 6, y + 6);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.g1);
      doc.text(wtLines, m + 6, y + 12);
      y += wtH + 8;
    }

    // ═══════════════════════════════════════════════════════
    // FACT-CHECKS
    // ═══════════════════════════════════════════════════════
    sectionTitle('Verificacoes de Fontes Externas');

    if (lastResult.sources && lastResult.sources.length > 0) {
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.g3);
      doc.text('Resultados da Google Fact Check API e bases de dados internacionais de fact-checking.', m, y);
      y += 9;

      lastResult.sources.forEach((fc, idx) => {
        const rCol  = /false|falso|fake|incorrect|enganoso|misleading/i.test(fc.rating) ? C.fake :
                      /true|verdade|correto|verdadeiro|correct/i.test(fc.rating)         ? C.real : C.susp;
        const fcLines = doc.splitTextToSize((fc.text||'').slice(0,180), cw - 14);
        const fcH     = fcLines.length * 4.8 + 24;
        checkPage(fcH + 6);

        // Card
        doc.setFillColor(...C.card);
        doc.roundedRect(m, y, cw, fcH, 3, 3, 'F');
        doc.setFillColor(...rCol);
        doc.rect(m, y, 3, fcH, 'F');

        // Número
        doc.setFillColor(...C.border);
        doc.circle(m + 11, y + 7, 4.5, 'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.white);
        doc.text(String(idx+1), m + 11, y + 9.5, { align:'center' });

        // Publisher
        doc.setFont('helvetica','bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.g1);
        doc.text((fc.publisher||'Fonte desconhecida').slice(0,45), m + 20, y + 8);

        // Rating pill
        const rLabel = (fc.rating||'Nao classificado').slice(0,28);
        const rW = doc.getTextWidth(rLabel) + 8;
        doc.setFillColor(...rCol);
        doc.roundedRect(W - m - rW - 2, y + 2.5, rW + 2, 7, 2, 2, 'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0,0,0);
        doc.text(rLabel, W - m - rW/2 - 1, y + 7.5, { align:'center' });

        // Texto
        doc.setFont('helvetica','normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.g2);
        doc.text(fcLines, m + 7, y + 16);

        // URL
        if (fc.url) {
          doc.setFont('helvetica','normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...C.blue);
          doc.text(fc.url.slice(0,75), m + 7, y + fcH - 4);
        }
        y += fcH + 5;
      });
    } else {
      checkPage(14);
      doc.setFillColor(...C.card);
      doc.roundedRect(m, y, cw, 12, 2, 2, 'F');
      doc.setFont('helvetica','italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.g3);
      doc.text('Nenhuma verificacao de fonte externa encontrada para este conteudo.', m + 5, y + 8);
      y += 18;
    }

    // ═══════════════════════════════════════════════════════
    // INDICADORES
    // ═══════════════════════════════════════════════════════
    if (lastResult.indicators && lastResult.indicators.length > 0) {
      sectionTitle('Indicadores Detetados pela IA');

      const cols = 2;
      const colW = (cw - 5) / cols;
      let colIdx = 0;
      let rowStartY = y;
      let maxColH = 0;

      lastResult.indicators.forEach((ind, idx) => {
        const indLines = doc.splitTextToSize(ind, colW - 16);
        const indH = indLines.length * 4.5 + 12;

        if (colIdx === 0) {
          checkPage(indH + 4);
          rowStartY = y;
          maxColH   = indH;
        } else {
          maxColH = Math.max(maxColH, indH);
        }

        const cx = m + colIdx * (colW + 5);

        doc.setFillColor(...C.card);
        doc.roundedRect(cx, rowStartY, colW, indH, 2, 2, 'F');

        // Dot accent
        doc.setFillColor(...C.accent);
        doc.circle(cx + 6, rowStartY + 6, 2.5, 'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0,0,0);
        doc.text(String(idx+1), cx + 6, rowStartY + 8, { align:'center' });

        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.g2);
        doc.text(indLines, cx + 12, rowStartY + 7);

        colIdx++;
        if (colIdx >= cols) {
          y += maxColH + 4;
          colIdx = 0;
          maxColH = 0;
        }
      });
      if (colIdx !== 0) y = rowStartY + maxColH + 4;
      y += 4;
    }

    // ═══════════════════════════════════════════════════════
    // METODOLOGIA
    // ═══════════════════════════════════════════════════════
    sectionTitle('Metodologia de Verificacao');

    const steps = [
      'Obtencao e limpeza do texto ou URL fornecido pelo utilizador.',
      'Validacao por IA: verificacao se o conteudo e uma afirmacao factual verificavel.',
      'Pesquisa na Google Fact Check API: bases internacionais como Reuters, AFP, Politifact e Poligrafo.',
      'Analise semantica profunda com Google Gemini 2.0 Flash com contexto dos fact-checks encontrados.',
      'Calculo do indice de fiabilidade combinando resultado da IA com fact-checks reais.',
    ];

    steps.forEach((desc, idx) => {
      const dLines = doc.splitTextToSize(desc, cw - 22);
      const sH     = dLines.length * 4.5 + 10;
      checkPage(sH + 4);

      doc.setFillColor(...C.card);
      doc.roundedRect(m, y, cw, sH, 2, 2, 'F');

      // Número
      doc.setFillColor(...C.blue);
      doc.circle(m + 7, y + sH/2, 4, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.white);
      doc.text(String(idx+1), m + 7, y + sH/2 + 2.5, { align:'center' });

      // Separador
      doc.setFillColor(...C.border);
      doc.rect(m + 14, y + 3, 0.3, sH - 6, 'F');

      // Texto
      doc.setFont('helvetica','normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.g2);
      const tY = y + (sH - dLines.length * 4.5) / 2 + 4.5;
      doc.text(dLines, m + 18, tY);

      y += sH + 4;
    });
    y += 6;

    // ═══════════════════════════════════════════════════════
    // AVISO LEGAL
    // ═══════════════════════════════════════════════════════
    checkPage(26);
    const disclaimer = 'Este relatorio foi gerado automaticamente por inteligencia artificial e deve ser usado apenas como referencia. O VeriFact nao garante a precisao absoluta dos resultados. Recomendamos sempre verificar as informacoes junto de fontes jornalisticas credenciadas antes de partilhar qualquer conteudo.';
    const dLines = doc.splitTextToSize(disclaimer, cw - 14);
    const dH     = dLines.length * 4.5 + 14;

    doc.setFillColor(50, 15, 20);
    doc.roundedRect(m, y, cw, dH, 3, 3, 'F');
    doc.setFillColor(...C.fake);
    doc.rect(m, y, 3, dH, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.fake);
    doc.text('AVISO LEGAL', m + 8, y + 7);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.setTextColor(210,170,175);
    doc.text(dLines, m + 8, y + 13);
    y += dH + 10;

    // ═══════════════════════════════════════════════════════
    // FOOTERS EM TODAS AS PÁGINAS
    // ═══════════════════════════════════════════════════════
    const totalPgs = doc.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
      doc.setPage(p);
      addFooter(p);
    }

    const fname = 'verifact-relatorio-' + lastResult.verdict + '-' + Date.now() + '.pdf';
    doc.save(fname);
    showToast('Relatorio PDF gerado com sucesso!','success');
    if (typeof Reports!=='undefined' && typeof VF_isLoggedIn==='function' && VF_isLoggedIn()) {
      Reports.save(null, fname, rel).catch(()=>{});
    }
  } catch(e) {
    console.error('PDF error:', e);
    showToast('Erro ao gerar PDF: '+e.message,'error');
  }
}

// ── FUNÇÃO PRINCIPAL ───────────────────────────────────────
async function runScan() {
  let inputText = '';

  if (currentMode==='text') {
    inputText = (document.getElementById('newsText')?.value||'').trim();
    if (inputText.length < 20) { showToast('Insere pelo menos 20 caracteres.','error'); return; }
  } else {
    const url = (document.getElementById('newsUrl')?.value||'').trim();
    if (!url.startsWith('http')) { showToast('Insere um URL válido.','error'); return; }
    inputText = url;
  }

  // Reset UI
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('progressSection').classList.add('active');
  document.getElementById('scanBtn').disabled = true;
  for (let i=0;i<6;i++) setStep(i,'','—');
  setProgress(0,'A iniciar...');
  lastResult = null;

  let analysisText = inputText;

  try {
    // PASSO 0 — Obter conteúdo
    setStep(0,'active','A processar...');
    setProgress(5,'A obter conteúdo...');
    if (currentMode==='url') {
      try {
        console.log('🔗 A tentar obter URL:', inputText);
        analysisText = await fetchUrlContent(inputText);
        console.log('✓ Conteúdo obtido:', analysisText.length, 'chars');
        console.log('📄 Preview:', analysisText.slice(0,200));
        setStep(0,'done','✓ Conteúdo obtido ('+analysisText.length+' chars)');
      } catch(e) {
        console.error('✗ fetchUrlContent falhou:', e);
        setStep(0,'error','✗ '+e.message);
        showToast(e.message,'error');
        document.getElementById('progressSection').classList.remove('active');
        document.getElementById('scanBtn').disabled=false;
        return;
      }
    } else {
      await sleep(200);
      setStep(0,'done','✓ Texto recebido');
    }
    setProgress(15,'Conteúdo pronto');

    // PASSO 1 — Validar se é notícia
    setStep(1,'active','A validar conteúdo...');
    setProgress(22,'A verificar se é uma notícia...');
    const validation = await validateIsNews(analysisText);

    if (!validation.is_news) {
      setStep(1,'error','✗ Não é uma notícia');
      setProgress(100,'Análise interrompida');
      document.getElementById('progressSection').classList.remove('active');
      document.getElementById('scanBtn').disabled=false;
      showNotNewsResult(validation.reason);
      return;
    }
    setStep(1,'done','✓ Notícia: '+(validation.topic||''));
    setProgress(30,'Conteúdo validado');

    // PASSO 2 — Google Fact Check
    setStep(2,'active','A pesquisar em bases de dados...');
    setProgress(42,'A consultar Google Fact Check API...');
    const keywords = analysisText.replace(/[^\w\s]/g,' ').split(/\s+/).filter(w=>w.length>4).slice(0,8).join(' ');
    const factChecks = await searchFactCheck(keywords);
    if (factChecks.length>0) {
      setStep(2,'done','✓ '+factChecks.length+' verificação(ões) encontrada(s)');
      setProgress(55,factChecks.length+' resultados de fact-checking encontrados');
    } else {
      setStep(2,'done','○ Sem verificações anteriores');
      setProgress(55,'Nenhum registo encontrado — a analisar com IA');
    }

    // PASSO 3 — Gemini
    setStep(3,'active','A analisar com IA...');
    setProgress(65,'Gemini AI a processar...');
    const aiResult = await analyzeWithGemini(analysisText, factChecks);
    setStep(3,'done','✓ Análise concluída');
    setProgress(80,'Análise completa');

    // PASSO 4 — Calcular veredicto final
    setStep(4,'active','A calcular veredicto...');
    setProgress(88,'A calcular veredicto final...');
    await sleep(300);

    // Ajustar reliability se há fact-checks com veredictos claros
    let reliability = aiResult.reliability;
    let verdict     = aiResult.verdict;
    if (factChecks.length>0) {
      const ratings  = factChecks.map(f=>f.rating.toLowerCase());
      const hasFalse = ratings.some(r=>['falso','false','fake','enganoso','incorreto','misleading'].some(k=>r.includes(k)));
      const hasTrue  = ratings.some(r=>['verdade','true','correto','verdadeiro'].some(k=>r.includes(k)));
      if (hasFalse) reliability = Math.min(reliability, 28);
      if (hasTrue)  reliability = Math.max(reliability, 65);
    }

    // Reconciliar APENAS a reliability para ser consistente com o veredicto da IA
    // O veredicto da IA é o mais importante — apenas ajustamos a percentagem
    if (verdict === 'fake'       && reliability > 40)  reliability = Math.min(reliability, 38);
    if (verdict === 'real'       && reliability < 60)  reliability = Math.max(reliability, 62);
    if (verdict === 'suspicious' && reliability > 74)  reliability = 65;
    if (verdict === 'suspicious' && reliability < 36)  reliability = 42;

    setStep(4,'done','✓ Veredicto: '+verdictLabel(verdict));
    setProgress(95,'A finalizar...');

    // PASSO 5 — Guardar
    setStep(5,'active','A guardar...');
    const finalResult = {
      ...aiResult, verdict, reliability, sources: factChecks,
      inputText: analysisText.slice(0,300),
    };
    lastResult = finalResult;

    if (typeof VF_isLoggedIn==='function' && VF_isLoggedIn() && typeof Scans!=='undefined') {
      try {
        await Scans.save({
          input_type:    currentMode,
          input_content: analysisText.slice(0,2000),
          verdict:       finalResult.verdict,
          reliability:   finalResult.reliability,
          confidence:    finalResult.confidence,
          fake_score:    100-finalResult.reliability,
          summary:       finalResult.summary,
          sources:       JSON.stringify(finalResult.sources),
        });
      } catch(e) { console.warn('Erro ao guardar scan:', e); }
    }

    setStep(5,'done','✓ Concluído');
    setProgress(100,'Análise completa!');
    await sleep(400);

    document.getElementById('progressSection').classList.remove('active');
    showResult(finalResult, factChecks);

  } catch(err) {
    console.error('Scan error:', err);
    showToast('Erro: '+err.message,'error');
    document.getElementById('progressSection').classList.remove('active');
    document.getElementById('scanBtn').disabled=false;
  }
}

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', ()=>{
  const ta = document.getElementById('newsText');
  const cc = document.getElementById('charCount');
  if (ta && cc) ta.addEventListener('input', ()=>{ cc.textContent=ta.value.length; });

  document.getElementById('scanBtn')?.addEventListener('click', runScan);
  document.getElementById('clearBtn')?.addEventListener('click', resetScan);

  const pre = sessionStorage.getItem('vf_scan_text');
  if (pre) {
    sessionStorage.removeItem('vf_scan_text');
    if (pre.startsWith('http')) {
      switchTab('url');
      const u=document.getElementById('newsUrl'); if(u) u.value=pre;
    } else {
      if(ta) ta.value=pre;
      if(cc) cc.textContent=pre.length;
    }
  }
});
