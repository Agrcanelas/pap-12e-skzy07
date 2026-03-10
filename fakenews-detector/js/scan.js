// ============================================================
//  scan.js — VeriFact: Google Fact Check API + Groq AI
// ============================================================

const GROQ_API_KEY  = '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';
const GROQ_URL      = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const FACTCHECK_KEY = 'AIzaSyCUQZ5pI7bhQL8dwIxgPD8KfofnbF6ZNLc';
const FACTCHECK_URL = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

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
  const proxies = [
    'https://api.allorigins.win/get?url='+encodeURIComponent(url),
    'https://corsproxy.io/?'+encodeURIComponent(url),
  ];
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const json = await r.json().catch(()=>null);
      const html = json?.contents || await r.text();
      const div  = document.createElement('div');
      div.innerHTML = html;
      ['script','style','nav','footer','header','aside'].forEach(tag=>
        div.querySelectorAll(tag).forEach(el=>el.remove()));
      const clean = (div.innerText||div.textContent||'').replace(/\s+/g,' ').trim().slice(0,3000);
      if (clean.length > 100) return clean;
    } catch {}
  }
  throw new Error('Não foi possível obter o conteúdo do URL. Cola o texto diretamente.');
}

// ── PASSO 1: Validar se é notícia ─────────────────────────
async function validateIsNews(text) {
  const prompt = `Analisa este texto e responde APENAS com JSON válido sem markdown.

Texto: "${text.slice(0,500)}"

Responde:
{"is_news":true ou false,"reason":"motivo em 1 frase","topic":"tema em 3 palavras","language":"pt/en/outro"}

É notícia/afirmação factual se: descreve evento real ou alegado, contém afirmação verificável, parece titular ou post sobre algo acontecido.
NÃO é notícia se: é ficção óbvia, poesia, código, receita, texto sem sentido ("aaa","hello","teste"), pergunta genérica sem afirmação.`;

  try {
    const r = await fetch(GROQ_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_API_KEY},
      body: JSON.stringify({ model:GROQ_MODEL, max_tokens:120, temperature:0,
        messages:[{role:'user',content:prompt}] })
    });
    const data = await r.json();
    const raw  = (data.choices?.[0]?.message?.content||'{}').replace(/```json|```/g,'').trim();
    return JSON.parse(raw);
  } catch {
    return { is_news:true, reason:'Validação indisponível', topic:'', language:'pt' };
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

// ── PASSO 3: Groq análise final ───────────────────────────
async function analyzeWithGroq(text, factChecks) {
  const fcContext = factChecks.length > 0
    ? '\n\nVERIFICAÇÕES REAIS ENCONTRADAS:\n' + factChecks.map((f,i)=>
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

  const r = await fetch(GROQ_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+GROQ_API_KEY},
    body: JSON.stringify({ model:GROQ_MODEL, max_tokens:600, temperature:0.1,
      messages:[{role:'user',content:prompt}] })
  });
  if (!r.ok) throw new Error('Erro Groq ('+r.status+'). Verifica a chave API.');
  const data = await r.json();
  if (data.error) throw new Error('Groq: '+data.error.message);
  const raw = (data.choices?.[0]?.message?.content||'{}').replace(/```json|```/g,'').trim();
  try {
    const p = JSON.parse(raw);
    return {
      verdict:        ['fake','real','suspicious'].includes(p.verdict)?p.verdict:'suspicious',
      reliability:    Math.min(99,Math.max(1,p.reliability||50)),
      confidence:     Math.min(99,Math.max(20,p.confidence||50)),
      summary:        p.summary||'Análise concluída.',
      what_is_true:   p.what_is_true||'',
      verdict_reason: p.verdict_reason||'',
      indicators:     Array.isArray(p.indicators)?p.indicators:[],
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
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const W=210, H=297, m=18, cw=W-m*2;
    let y=0, page=1;

    // ── Cores ──────────────────────────────────────────────
    const C = {
      dark:    [10,10,20],
      dark2:   [22,22,35],
      dark3:   [30,30,50],
      accent:  [0,220,140],
      accent2: [0,200,230],
      fake:    [220,50,80],
      susp:    [220,180,0],
      real:    [0,220,140],
      white:   [255,255,255],
      gray1:   [200,200,215],
      gray2:   [140,140,160],
      gray3:   [80,80,100],
      text:    [30,30,50],
    };

    const vColor = lastResult.verdict==='fake' ? C.fake :
                   lastResult.verdict==='real' ? C.real : C.susp;
    const vLabel = verdictLabel(lastResult.verdict);
    const rel    = lastResult.reliability || 50;
    const now    = new Date();
    const dateStr= now.toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const timeStr= now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    const user   = (typeof VF_getUser==='function') ? VF_getUser() : null;
    const reportId = 'VF-'+Date.now().toString(36).toUpperCase();

    // ════════════════════════════════════════════════════════
    // FUNÇÕES AUXILIARES
    // ════════════════════════════════════════════════════════

    function addHeader() {
      // Fundo principal
      doc.setFillColor(...C.dark); doc.rect(0,0,W,56,'F');

      // Bloco lateral esquerdo accent
      doc.setFillColor(...C.accent); doc.rect(0,0,5,56,'F');

      // Faixa inferior do header
      doc.setFillColor(...C.dark2); doc.rect(5,42,W-5,14,'F');

      // Linha gradiente no fundo do header
      for(let i=0;i<W-5;i++){
        const t = i/(W-5);
        const g2 = Math.round(220*(1-t)+200*t);
        const b2 = Math.round(140*(1-t)+230*t);
        doc.setFillColor(0,g2,b2);
        doc.rect(5+i,55,1,1.5,'F');
      }

      // Logo grande
      doc.setTextColor(...C.accent); doc.setFontSize(28); doc.setFont('helvetica','bold');
      doc.text('VERI', m, 22);
      const vw = doc.getTextWidth('VERI');
      doc.setTextColor(255,255,255);
      doc.text('FACT', m+vw, 22);

      // Tag abaixo do logo
      doc.setFillColor(...C.accent); doc.roundedRect(m, 26, 62, 7, 2, 2, 'F');
      doc.setTextColor(0,0,0); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text('RELATORIO DE VERIFICACAO DE FACTOS', m+3, 31);

      // Linha separadora vertical
      doc.setDrawColor(...C.dark3); doc.setLineWidth(0.3);
      doc.line(W/2, 6, W/2, 40);

      // Bloco info direita - caixa
      doc.setFillColor(...C.dark3); doc.roundedRect(W/2+4, 5, W/2-m-4, 34, 2, 2, 'F');

      doc.setTextColor(...C.accent2); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
      doc.text('ID DO RELATORIO', W/2+8, 12);
      doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      doc.text(reportId, W/2+8, 18);

      doc.setTextColor(...C.accent2); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
      doc.text('DATA E HORA', W/2+8, 26);
      doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.text(dateStr+' - '+timeStr, W/2+8, 32);

      // Rodapé do header
      doc.setTextColor(...C.gray3); doc.setFontSize(7);
      doc.text('verifact.fwh.is', m, 50);
      if(user) {
        doc.setTextColor(...C.gray2);
        doc.text('Utilizador: '+(user.name||user.email||''), W-m, 50, {align:'right'});
      }

      y = 66;
    }

    function addFooter(pg, total) {
      // Linha
      doc.setDrawColor(...C.dark3); doc.setLineWidth(0.3);
      doc.line(m, H-16, W-m, H-16);
      // Fundo
      doc.setFillColor(...C.dark); doc.rect(0,H-14,W,14,'F');
      // Texto
      doc.setTextColor(...C.gray3); doc.setFontSize(7); doc.setFont('helvetica','normal');
      doc.text('VeriFact — Detector de Fake News com Inteligência Artificial', m, H-7);
      doc.text('Este relatório foi gerado automaticamente e deve ser usado apenas como referência.', m, H-3.5);
      doc.setTextColor(...C.accent2);
      doc.text('Página '+pg+(total?' de '+total:''), W-m, H-7, {align:'right'});
      doc.text('verifact.fwh.is', W-m, H-3.5, {align:'right'});
    }

    function sectionTitle(title) {
      checkPage(16);
      // Fundo escuro com borda accent
      doc.setFillColor(18,18,30);
      doc.roundedRect(m, y, cw, 10, 2, 2, 'F');
      // Barra accent esquerda
      doc.setFillColor(...C.accent);
      doc.roundedRect(m, y, 3, 10, 1, 1, 'F');
      // Linha accent direita fina
      doc.setFillColor(...C.accent2);
      doc.roundedRect(m+cw-2, y, 2, 10, 1, 1, 'F');
      // Texto
      doc.setTextColor(...C.accent); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(title.toUpperCase(), m+8, y+7);
      y += 15;
    }

    function checkPage(needed) {
      if (y + needed > H-22) {
        addFooter(page, null);
        doc.addPage();
        page++;
        addHeader();
      }
    }

    function textBlock(text, size, color, bold, indent, lineH) {
      const fnt = bold ? 'bold' : 'normal';
      const lh  = lineH || (size * 0.42);
      doc.setFont('helvetica', fnt);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, cw-(indent||0));
      checkPage(lines.length * lh + 4);
      doc.text(lines, m+(indent||0), y);
      y += lines.length * lh + 3;
      return lines.length * lh + 3;
    }

    function infoRow(label, value, labelColor, valueColor) {
      checkPage(7);
      doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.setTextColor(...(labelColor||C.gray2));
      doc.text(label+':', m+2, y);
      doc.setFont('helvetica','normal');
      doc.setTextColor(...(valueColor||C.gray1));
      const vlines = doc.splitTextToSize(String(value||''), cw-45);
      doc.text(vlines, m+38, y);
      y += Math.max(6, vlines.length*4.5);
    }

    // ════════════════════════════════════════════════════════
    // PÁGINA 1
    // ════════════════════════════════════════════════════════
    addHeader();

    // ── VEREDICTO PRINCIPAL ──────────────────────────────
    doc.setFillColor(...vColor);
    doc.roundedRect(m, y, cw, 28, 4, 4, 'F');
    // Overlay escuro leve
    doc.setFillColor(0,0,0); doc.setGState(new doc.GState({opacity:0.15}));
    doc.roundedRect(m, y, cw, 28, 4, 4, 'F');
    doc.setGState(new doc.GState({opacity:1}));

    doc.setTextColor(0,0,0); doc.setFontSize(18); doc.setFont('helvetica','bold');
    const vIcon = lastResult.verdict==='fake'?'FALSO':lastResult.verdict==='real'?'VERDADEIRO':'SUSPEITO';
    doc.text(vIcon, m+8, y+12);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Veredicto da análise com Inteligência Artificial', m+8, y+19);
    // Fiabilidade direita
    doc.setFontSize(22); doc.setFont('helvetica','bold');
    doc.text(rel+'%', W-m-8, y+14, {align:'right'});
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text('índice de fiabilidade', W-m-8, y+21, {align:'right'});
    y += 34;

    // ── BARRA DE FIABILIDADE ─────────────────────────────
    checkPage(18);
    doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, 8, 4, 4, 'F');
    const barW = (cw * rel / 100);
    doc.setFillColor(...vColor); doc.roundedRect(m, y, barW, 8, 4, 4, 'F');
    doc.setTextColor(...C.gray2); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('0%', m, y+13); doc.text('50%', m+cw/2, y+13, {align:'center'}); doc.text('100%', m+cw, y+13, {align:'right'});
    y += 18;

    // ── INFORMAÇÕES DA ANÁLISE ───────────────────────────
    sectionTitle('Informações da Análise', '');
    doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, 38, 3, 3, 'F');
    y += 6;
    infoRow('Data e Hora',     dateStr+' às '+timeStr, C.gray2, C.text);
    infoRow('ID do Relatório', reportId,                C.gray2, C.accent2);
    infoRow('Veredicto',       vLabel+' ('+rel+'% fiável)', C.gray2, vColor);
    infoRow('Confiança IA',    (lastResult.confidence||'N/D')+'%', C.gray2, C.text);
    if(user) infoRow('Utilizador', user.name||user.email||'', C.gray2, C.text);
    y += 4;

    // ── TEXTO ANALISADO ──────────────────────────────────
    sectionTitle('Conteúdo Analisado', '');
    const inputText = lastResult.inputText || '';
    doc.setFillColor(...C.dark2); 
    const inputLines = doc.splitTextToSize(inputText.slice(0,600)+(inputText.length>600?'...':''), cw-12);
    const inputH = Math.max(20, inputLines.length * 4.5 + 10);
    checkPage(inputH + 4);
    doc.roundedRect(m, y, cw, inputH, 3, 3, 'F');
    doc.setFillColor(...C.accent); doc.roundedRect(m, y, 2, inputH, 1, 1, 'F');
    doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor(...C.gray1);
    doc.text(inputLines, m+6, y+6);
    y += inputH + 8;

    // ── RESUMO DA IA ─────────────────────────────────────
    sectionTitle('Análise da Inteligência Artificial', '');
    textBlock(lastResult.summary || 'Sem resumo disponível.', 9.5, C.text, false, 0, 4.8);
    y += 4;

    // ════════════════════════════════════════════════════════
    // FACT-CHECKS
    // ════════════════════════════════════════════════════════
    if (lastResult.sources && lastResult.sources.length > 0) {
      sectionTitle('Verificações de Fontes Externas', '');
      doc.setTextColor(...C.gray2); doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text('Resultados obtidos através da Google Fact Check API e bases de dados internacionais de fact-checking.', m, y);
      y += 8;

      lastResult.sources.forEach((fc, idx) => {
        const ratingColor = /false|falso|fake|incorrect/i.test(fc.rating) ? C.fake :
                            /true|verdadeiro|correct/i.test(fc.rating)     ? C.real : C.susp;

        const fcText = (fc.text||'').slice(0,200);
        const fcLines = doc.splitTextToSize(fcText, cw-10);
        const fcH = fcLines.length*4.5 + 22;
        checkPage(fcH + 6);

        // Card
        doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, fcH, 3, 3, 'F');
        doc.setFillColor(...ratingColor); doc.roundedRect(m, y, 3, fcH, 1, 1, 'F');

        // Número
        doc.setFillColor(...ratingColor); doc.circle(m+10, y+8, 4, 'F');
        doc.setTextColor(0,0,0); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(String(idx+1), m+10, y+10, {align:'center'});

        // Publisher + rating
        doc.setTextColor(...C.gray1); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
        doc.text((fc.publisher||'Fonte desconhecida').slice(0,40), m+17, y+7);
        doc.setFillColor(...ratingColor);
        const rLabel = (fc.rating||'Não classificado').slice(0,30);
        const rW = doc.getTextWidth(rLabel)+8;
        doc.roundedRect(W-m-rW-2, y+2, rW+2, 7, 2, 2, 'F');
        doc.setTextColor(0,0,0); doc.setFontSize(7); doc.setFont('helvetica','bold');
        doc.text(rLabel, W-m-rW/2-1, y+7, {align:'center'});

        // Texto
        doc.setTextColor(...C.gray1); doc.setFontSize(8.5); doc.setFont('helvetica','normal');
        doc.text(fcLines, m+6, y+14);

        // URL
        if(fc.url) {
          doc.setTextColor(...C.accent2); doc.setFontSize(7);
          doc.text(fc.url.slice(0,70), m+6, y+fcH-4);
        }

        y += fcH + 5;
      });
    } else {
      sectionTitle('Verificações de Fontes Externas', '');
      doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, 14, 3, 3, 'F');
      doc.setTextColor(...C.gray2); doc.setFontSize(9); doc.setFont('helvetica','italic');
      doc.text('Nenhuma verificação de fonte externa encontrada para este conteúdo.', m+6, y+9);
      y += 20;
    }

    // ════════════════════════════════════════════════════════
    // INDICADORES
    // ════════════════════════════════════════════════════════
    if (lastResult.indicators && lastResult.indicators.length > 0) {
      sectionTitle('Indicadores Detetados pela IA', '');
      doc.setTextColor(...C.gray2); doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text('Padrões e características identificadas no conteúdo analisado:', m, y);
      y += 8;

      lastResult.indicators.forEach((ind, idx) => {
        const indLines = doc.splitTextToSize(ind, cw-16);
        const indH = indLines.length*4.5+8;
        checkPage(indH+3);
        doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, indH, 2, 2, 'F');
        doc.setFillColor(...C.susp); doc.roundedRect(m, y, 2, indH, 1, 1, 'F');
        doc.setTextColor(...C.accent); doc.setFontSize(8); doc.setFont('helvetica','bold');
        doc.text(String(idx+1), m+5, y+indH/2+2);
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.gray1);
        doc.text(indLines, m+14, y+5);
        y += indH+4;
      });
      y += 4;
    }

    // ════════════════════════════════════════════════════════
    // METODOLOGIA
    // ════════════════════════════════════════════════════════
    sectionTitle('Metodologia de Verificação', '');
    checkPage(55);
    doc.setFillColor(...C.dark2); doc.roundedRect(m, y, cw, 50, 3, 3, 'F');
    y += 7;
    const steps = [
      ['1. Obtenção do Conteúdo', 'Extração e limpeza do texto fornecido pelo utilizador, seja texto direto ou URL.'],
      ['2. Validação', 'A IA verifica se o conteúdo é uma afirmação factual verificável.'],
      ['3. Google Fact Check API', 'Pesquisa em bases de dados internacionais: Polígrafo, Reuters, AFP, Lupa, PolitiFact, e outras.'],
      ['4. Análise com IA (Groq LLaMA 3.3 70B)', 'Análise semântica profunda com contexto dos fact-checks encontrados.'],
      ['5. Cálculo da Fiabilidade', 'Combinação do resultado da IA com os fact-checks reais para determinar o índice final.'],
    ];
    steps.forEach(([title, desc]) => {
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...C.accent);
      doc.text(title, m+5, y);
      doc.setFont('helvetica','normal'); doc.setTextColor(...C.gray2);
      doc.text(desc, m+5, y+4.5);
      y += 10;
    });
    y += 4;

    // ════════════════════════════════════════════════════════
    // AVISO LEGAL
    // ════════════════════════════════════════════════════════
    checkPage(28);
    doc.setFillColor(60,20,20); doc.roundedRect(m, y, cw, 22, 3, 3, 'F');
    doc.setFillColor(...C.fake); doc.roundedRect(m, y, 3, 22, 1, 1, 'F');
    doc.setTextColor(...C.fake); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text('AVISO IMPORTANTE', m+7, y+7);
    doc.setTextColor(220,180,180); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    const disclaimer = 'Este relatório foi gerado automaticamente por inteligência artificial e deve ser usado apenas como referência. O VeriFact não garante a precisão absoluta dos resultados. Recomendamos sempre verificar as informações junto de fontes jornalísticas credenciadas antes de partilhar qualquer conteúdo.';
    const dLines = doc.splitTextToSize(disclaimer, cw-10);
    doc.text(dLines, m+7, y+13);
    y += 28;

    // Footers em todas as páginas
    const totalPages = doc.getNumberOfPages();
    for(let p=1; p<=totalPages; p++) {
      doc.setPage(p);
      addFooter(p, totalPages);
    }

    const fname = 'verifact-relatorio-'+lastResult.verdict+'-'+Date.now()+'.pdf';
    doc.save(fname);
    showToast('📄 Relatório PDF gerado com sucesso!','success');
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
        analysisText = await fetchUrlContent(inputText);
        setStep(0,'done','✓ Conteúdo obtido ('+analysisText.length+' chars)');
      } catch(e) {
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

    // PASSO 3 — Groq
    setStep(3,'active','A analisar com IA...');
    setProgress(65,'Groq AI a processar...');
    const aiResult = await analyzeWithGroq(analysisText, factChecks);
    setStep(3,'done','✓ Análise concluída');
    setProgress(80,'Análise completa');

    // PASSO 4 — Calcular veredicto final
    setStep(4,'active','A calcular veredicto...');
    setProgress(88,'A calcular veredicto final...');
    await sleep(300);

    // Ajustar reliability se há fact-checks com veredictos claros
    let reliability = aiResult.reliability;
    if (factChecks.length>0) {
      const ratings = factChecks.map(f=>f.rating.toLowerCase());
      const hasFalse = ratings.some(r=>['falso','false','fake','enganoso','incorreto','misleading'].some(k=>r.includes(k)));
      const hasTrue  = ratings.some(r=>['verdade','true','correto','verdadeiro'].some(k=>r.includes(k)));
      if (hasFalse) reliability = Math.min(reliability, 28);
      if (hasTrue)  reliability = Math.max(reliability, 65);
    }

    setStep(4,'done','✓ Veredicto: '+verdictLabel(aiResult.verdict));
    setProgress(95,'A finalizar...');

    // PASSO 5 — Guardar
    setStep(5,'active','A guardar...');
    const finalResult = {
      ...aiResult, reliability, sources: factChecks,
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
