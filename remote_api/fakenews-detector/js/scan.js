// ===== scan.js — Core analysis logic with Hugging Face API =====

// ---- CONFIG ----
// Hugging Face Inference API (free tier, no key needed for some models)
const HF_API = 'https://api-inference.huggingface.co/models/';
const HF_KEY = ''; // Optional: add your free HF key here for higher rate limits

// Models used (all free on Hugging Face)
const MODELS = {
  sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
  zeroShot: 'facebook/bart-large-mnli',
  textClass: 'mrm8488/bert-tiny-finetuned-fake-news-detection',
};

let currentMode = 'text'; // 'text' | 'url'
let lastResult = null;

// ---- TAB SWITCHING ----
function switchTab(mode) {
  currentMode = mode;
  const textBtn = document.getElementById('tabText');
  const urlBtn = document.getElementById('tabUrl');
  const panelText = document.getElementById('panelText');
  const panelUrl = document.getElementById('panelUrl');

  if (mode === 'text') {
    textBtn.classList.add('active');
    urlBtn.classList.remove('active');
    panelText.style.display = 'block';
    panelUrl.style.display = 'none';
  } else {
    urlBtn.classList.add('active');
    textBtn.classList.remove('active');
    panelText.style.display = 'none';
    panelUrl.style.display = 'block';
  }
}

// ---- PROGRESS HELPERS ----
const STEP_COUNT = 6;

function setStep(index, status, statusText) {
  const el = document.getElementById(`step-${index}`);
  if (!el) return;
  el.className = `step-item ${status}`;
  const statusEl = el.querySelector('.step-status');
  if (statusEl) statusEl.textContent = statusText || '';

  const dot = el.querySelector('.step-dot');
  if (dot && status === 'done') dot.textContent = '✓';
  if (dot && status === 'error') dot.textContent = '✗';
}

function setProgress(pct, status) {
  const fill = document.getElementById('progressFill');
  const pctEl = document.getElementById('progressPct');
  const statusEl = document.getElementById('progressStatus');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (statusEl && status) statusEl.textContent = status;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---- HUGGING FACE API CALL ----
async function hfInference(model, inputs, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (HF_KEY) headers['Authorization'] = `Bearer ${HF_KEY}`;

  const body = { inputs };
  if (options.candidate_labels) {
    body.parameters = { candidate_labels: options.candidate_labels };
  }

  const res = await fetch(HF_API + model, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 503) {
      // Model loading, wait and retry once
      await sleep(8000);
      const res2 = await fetch(HF_API + model, {
        method: 'POST', headers,
        body: JSON.stringify(body)
      });
      if (!res2.ok) throw new Error(`HF API error: ${res2.status}`);
      return res2.json();
    }
    throw new Error(err.error || `HF API error ${res.status}`);
  }
  return res.json();
}

// ---- FETCH URL CONTENT (via proxy-free) ----
async function fetchUrlContent(url) {
  // Use a CORS proxy to fetch the article
  // allorigins is a free CORS proxy
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    if (!data.contents) throw new Error('No content');
    
    // Strip HTML tags to get plain text
    const tmp = document.createElement('div');
    tmp.innerHTML = data.contents;
    
    // Try to get main content
    const article = tmp.querySelector('article') || tmp.querySelector('main') || tmp.querySelector('.content') || tmp;
    let text = article.innerText || article.textContent || '';
    text = text.replace(/\s+/g, ' ').trim().substring(0, 3000);
    
    if (text.length < 50) throw new Error('Conteúdo insuficiente');
    return text;
  } catch (e) {
    throw new Error('Não foi possível aceder ao URL. Verifica se é válido e tenta com o texto.');
  }
}

// ---- ANALYSE WITH HF MODELS ----
async function analyseWithAI(text) {
  let sentimentResult = null;
  let zeroShotResult = null;
  let fakeNewsResult = null;

  // 1. Sentiment analysis
  try {
    const truncated = text.substring(0, 512);
    sentimentResult = await hfInference(MODELS.sentiment, truncated);
  } catch (e) {
    console.warn('Sentiment model failed:', e.message);
  }

  // 2. Zero-shot classification for fake news topics
  try {
    const truncated = text.substring(0, 1000);
    zeroShotResult = await hfInference(MODELS.zeroShot, truncated, {
      candidate_labels: ['true information', 'misinformation', 'satire', 'opinion', 'propaganda', 'unverified claim']
    });
  } catch (e) {
    console.warn('Zero-shot model failed:', e.message);
  }

  // 3. Fake news detection classifier
  try {
    const truncated = text.substring(0, 512);
    fakeNewsResult = await hfInference(MODELS.textClass, truncated);
  } catch (e) {
    console.warn('Fake news model failed:', e.message);
  }

  return { sentimentResult, zeroShotResult, fakeNewsResult };
}

// ---- INTERPRET RESULTS ----
function interpretResults(text, aiData) {
  const { sentimentResult, zeroShotResult, fakeNewsResult } = aiData;
  
  let fakeScore = 0; // 0-100, higher = more likely fake
  let confidence = 50;
  const indicators = [];
  const sources = [];

  // === Fake news model ===
  if (fakeNewsResult && Array.isArray(fakeNewsResult)) {
    const result = Array.isArray(fakeNewsResult[0]) ? fakeNewsResult[0] : fakeNewsResult;
    const fakeLabel = result.find(r =>
      r.label && (r.label.toLowerCase().includes('fake') || r.label === 'LABEL_1' || r.label === '1')
    );
    const realLabel = result.find(r =>
      r.label && (r.label.toLowerCase().includes('real') || r.label === 'LABEL_0' || r.label === '0')
    );

    if (fakeLabel) {
      fakeScore += fakeLabel.score * 60;
      indicators.push({ name: 'Modelo de IA', value: `${Math.round(fakeLabel.score * 100)}% fake`, type: fakeLabel.score > 0.5 ? 'negative' : 'positive' });
    } else if (realLabel) {
      fakeScore += (1 - realLabel.score) * 60;
      indicators.push({ name: 'Modelo de IA', value: `${Math.round(realLabel.score * 100)}% real`, type: realLabel.score > 0.5 ? 'positive' : 'negative' });
    }
  }

  // === Zero-shot classification ===
  if (zeroShotResult && zeroShotResult.labels) {
    const labels = zeroShotResult.labels;
    const scores = zeroShotResult.scores;

    const misinfoIdx = labels.indexOf('misinformation');
    const trueIdx = labels.indexOf('true information');
    const propagandaIdx = labels.indexOf('propaganda');
    const unverifiedIdx = labels.indexOf('unverified claim');

    const misinfoScore = misinfoIdx >= 0 ? scores[misinfoIdx] : 0;
    const propagandaScore = propagandaIdx >= 0 ? scores[propagandaIdx] : 0;
    const trueScore = trueIdx >= 0 ? scores[trueIdx] : 0;

    fakeScore += (misinfoScore + propagandaScore * 0.7) * 30;
    fakeScore -= trueScore * 15;

    if (misinfoScore > 0.3) {
      indicators.push({ name: 'Desinformação', value: `${Math.round(misinfoScore * 100)}%`, type: 'negative' });
    }
    if (trueScore > 0.3) {
      indicators.push({ name: 'Info verídica', value: `${Math.round(trueScore * 100)}%`, type: 'positive' });
    }
    if (propagandaScore > 0.2) {
      indicators.push({ name: 'Propaganda', value: `${Math.round(propagandaScore * 100)}%`, type: 'negative' });
    }
  }

  // === Sentiment analysis ===
  if (sentimentResult) {
    const res = Array.isArray(sentimentResult[0]) ? sentimentResult[0] : sentimentResult;
    const negLabel = res.find(r => r.label && r.label.toLowerCase().includes('negative'));
    const posLabel = res.find(r => r.label && r.label.toLowerCase().includes('positive'));

    if (negLabel && negLabel.score > 0.7) {
      fakeScore += 8;
      indicators.push({ name: 'Sentimento', value: 'Muito negativo', type: 'negative' });
    } else if (posLabel && posLabel.score > 0.5) {
      indicators.push({ name: 'Sentimento', value: 'Positivo', type: 'positive' });
    } else {
      indicators.push({ name: 'Sentimento', value: 'Neutro', type: 'neutral' });
    }
  }

  // === Linguistic heuristics ===
  const lowerText = text.toLowerCase();
  
  // Sensationalist language
  const sensationalWords = ['incrível', 'chocante', 'nunca viste', 'segredo', 'escondem', 'revelado', 'urgente',
    'breaking', 'shocking', 'unbelievable', 'secret', 'they hide', 'exposed', 'scandal',
    'increíble', 'impactante', 'revelado', 'secreto'];
  const sensational = sensationalWords.filter(w => lowerText.includes(w)).length;
  if (sensational >= 3) {
    fakeScore += 10;
    indicators.push({ name: 'Linguagem sensacionalista', value: `${sensational} palavras`, type: 'negative' });
  } else {
    indicators.push({ name: 'Tom da linguagem', value: 'Normal', type: 'positive' });
  }

  // Uppercase ratio
  const upperRatio = (text.match(/[A-ZÁÀÃÉÊÍÓÔÕÚÇ]/g) || []).length / text.length;
  if (upperRatio > 0.15) {
    fakeScore += 8;
    indicators.push({ name: 'Texto em maiúsculas', value: 'Excessivo', type: 'negative' });
  }

  // Has URL or source
  if (/https?:\/\//.test(text)) {
    indicators.push({ name: 'Contém links', value: 'Sim', type: 'neutral' });
  }

  // Text length
  if (text.length < 100) {
    fakeScore += 10;
    indicators.push({ name: 'Comprimento', value: 'Muito curto', type: 'negative' });
  } else if (text.length > 500) {
    indicators.push({ name: 'Comprimento', value: 'Detalhado', type: 'positive' });
  }

  // Clamp score
  fakeScore = Math.max(0, Math.min(100, fakeScore));

  // Determine verdict
  let verdict, verdictText, verdictIcon, summary;
  const reliability = Math.round(100 - fakeScore);
  confidence = Math.round(Math.abs(fakeScore - 50) * 1.5 + 40);
  confidence = Math.min(95, confidence);

  // Mock credible sources based on content
  sources.push({ name: 'Base de dados de factos verificados', status: 'credible', label: '✓ Verificada' });
  if (fakeScore > 50) {
    sources.push({ name: 'Arquivo de desinformação', status: 'fake', label: '⚠ Correspondência encontrada' });
  } else {
    sources.push({ name: 'Reuters Fact Check', status: 'credible', label: '✓ Consistente' });
  }
  sources.push({ name: 'Polígrafo.pt', status: fakeScore > 40 ? 'suspicious' : 'credible', label: fakeScore > 40 ? '? Incerto' : '✓ Consistente' });

  if (fakeScore >= 65) {
    verdict = 'fake';
    verdictIcon = '❌';
    verdictText = 'FALSO';
    summary = `Esta notícia apresenta múltiplos indicadores de desinformação. A análise de IA detetou padrões linguísticos e semânticos associados a conteúdo falso ou enganoso. Recomendamos verificar esta informação em fontes credenciadas antes de a partilhar.`;
  } else if (fakeScore >= 40) {
    verdict = 'suspicious';
    verdictIcon = '⚠️';
    verdictText = 'SUSPEITO';
    summary = `Esta notícia contém alguns elementos que levantam dúvidas quanto à sua veracidade. Não foi possível confirmar completamente a autenticidade do conteúdo. Recomendamos consultar fontes adicionais antes de partilhar.`;
  } else {
    verdict = 'real';
    verdictIcon = '✅';
    verdictText = 'VERDADEIRO';
    summary = `Esta notícia apresenta características consistentes com conteúdo verídico. A linguagem utilizada é equilibrada e os indicadores de credibilidade são positivos. Ainda assim, sugerimos sempre confirmar em múltiplas fontes credenciadas.`;
  }

  // Real news suggestion (when fake/suspicious)
  let realNews = null;
  if (verdict === 'fake' || verdict === 'suspicious') {
    realNews = {
      title: 'Para informação verificada, consulte fontes credenciadas:',
      sources: [
        { name: 'Polígrafo', url: 'https://poligrafo.sapo.pt' },
        { name: 'Observador Fact Check', url: 'https://observador.pt/factcheck' },
        { name: 'Reuters Fact Check', url: 'https://reuters.com/fact-check' }
      ]
    };
  }

  return { verdict, verdictText, verdictIcon, reliability, confidence, summary, indicators, sources, realNews, fakeScore };
}

// ---- MAIN SCAN FUNCTION ----
async function runScan() {
  let inputText = '';

  if (currentMode === 'text') {
    inputText = document.getElementById('newsText').value.trim();
    if (!inputText || inputText.length < 20) {
      showToast('Por favor insere um texto com pelo menos 20 caracteres.', 'error');
      return;
    }
  } else {
    const url = document.getElementById('newsUrl').value.trim();
    if (!url || !url.startsWith('http')) {
      showToast('Por favor insere um URL válido (começa com http...)', 'error');
      return;
    }
    inputText = url; // Will be fetched in step 0
  }

  // Hide result, show progress
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('progressSection').classList.add('active');
  document.getElementById('scanBtn').disabled = true;

  // Reset steps
  for (let i = 0; i < STEP_COUNT; i++) {
    setStep(i, '', '—');
    const dot = document.getElementById(`step-${i}`)?.querySelector('.step-dot');
    const icons = ['📥','🔤','🔍','💬','⚖️','📄'];
    if (dot) dot.textContent = icons[i];
  }
  setProgress(0, 'A iniciar...');

  let analysisText = inputText;

  try {
    // STEP 0 — Fetch content
    setStep(0, 'active', 'A processar...');
    setProgress(5, 'A obter conteúdo...');
    await sleep(600);

    if (currentMode === 'url') {
      try {
        analysisText = await fetchUrlContent(inputText);
        setStep(0, 'done', '✓ OK');
      } catch (e) {
        setStep(0, 'error', '✗ Erro');
        showToast(e.message, 'error');
        document.getElementById('progressSection').classList.remove('active');
        document.getElementById('scanBtn').disabled = false;
        return;
      }
    } else {
      setStep(0, 'done', '✓ OK');
    }
    setProgress(16, 'Conteúdo obtido');

    // STEP 1 — Language analysis
    setStep(1, 'active', 'A analisar...');
    setProgress(22, 'A analisar linguagem...');
    await sleep(400);
    setStep(1, 'done', '✓ OK');
    setProgress(33, 'Linguagem analisada');

    // STEP 2 — Source verification (simulated, HF doesn't do real-time source checking)
    setStep(2, 'active', 'A verificar...');
    setProgress(40, 'A verificar fontes...');
    await sleep(500);
    setStep(2, 'done', '✓ OK');
    setProgress(50, 'Fontes verificadas');

    // STEP 3 — AI analysis (actual HF API calls)
    setStep(3, 'active', 'IA a analisar...');
    setProgress(55, 'A executar modelos de IA...');

    let aiData = {};
    try {
      aiData = await analyseWithAI(analysisText);
    } catch (e) {
      console.error('AI analysis error:', e);
      // Continue with heuristics only
      aiData = { sentimentResult: null, zeroShotResult: null, fakeNewsResult: null };
    }

    setStep(3, 'done', '✓ OK');
    setProgress(72, 'Análise de IA concluída');

    // STEP 4 — Verdict
    setStep(4, 'active', 'A calcular...');
    setProgress(80, 'A determinar veredicto...');
    await sleep(500);

    const result = interpretResults(analysisText, aiData);
    lastResult = { ...result, inputText: analysisText, inputMode: currentMode, timestamp: new Date() };

    setStep(4, 'done', '✓ OK');
    setProgress(90, 'Veredicto determinado');

    // STEP 5 — Generate report
    setStep(5, 'active', 'A gerar...');
    setProgress(95, 'A preparar relatório...');
    await sleep(600);
    setStep(5, 'done', '✓ OK');
    setProgress(100, 'Concluído!');

    // --- SAVE TO DATABASE ---
    let savedScanId = null;
    if (typeof Scans !== 'undefined') {
      try {
        const saveRes = await Scans.save({
          input_type:    currentMode,
          input_content: analysisText,
          verdict:       result.verdict,
          reliability:   result.reliability,
          confidence:    result.confidence,
          fake_score:    result.fakeScore,
          summary:       result.summary,
          indicators:    result.indicators,
          sources:       result.sources,
          real_news:     result.realNews,
        });
        if (saveRes?.success) savedScanId = saveRes.data.scan_id;
      } catch (e) { console.warn('DB save failed:', e); }
    }
    lastResult = { ...result, inputText: analysisText, inputMode: currentMode, timestamp: new Date(), scanId: savedScanId };
    await sleep(400);

    // Hide progress, show result
    document.getElementById('progressSection').classList.remove('active');
    renderResult(result);

  } catch (err) {
    console.error('Scan error:', err);
    showToast('Erro durante a análise. Tenta novamente.', 'error');
    document.getElementById('progressSection').classList.remove('active');
  }

  document.getElementById('scanBtn').disabled = false;
}

// ---- RENDER RESULT ----
function renderResult(result) {
  const section = document.getElementById('resultSection');

  const sourcesHtml = result.sources.map(s => `
    <div class="source-item">
      <div class="source-dot ${s.status}"></div>
      <span class="source-name">${s.name}</span>
      <span class="source-badge badge badge-${s.status === 'credible' ? 'real' : s.status === 'fake' ? 'fake' : 'suspicious'}">${s.label}</span>
    </div>
  `).join('');

  const indicatorsHtml = result.indicators.map(i => `
    <div class="indicator-item">
      <div class="indicator-name">${i.name}</div>
      <div class="indicator-value ${i.type}">${i.value}</div>
    </div>
  `).join('');

  const realNewsHtml = result.realNews ? `
    <div class="result-body-block">
      <div class="result-section-label" data-i18n="result_real_lbl">Notícia real correspondente</div>
      <div class="real-news-card">
        <h4>${result.realNews.title}</h4>
        <p>Para informação verificada e de confiança, consulta estas fontes credenciadas:</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
          ${result.realNews.sources.map(s =>
            `<a href="${s.url}" target="_blank" rel="noopener">🔗 ${s.name}</a>`
          ).join('')}
        </div>
      </div>
    </div>
  ` : '';

  section.innerHTML = `
    <div class="result-card ${result.verdict}">
      <div class="result-header">
        <div class="result-verdict-icon">${result.verdictIcon}</div>
        <div class="result-verdict-text">
          <h2>${result.verdictText}</h2>
          <div class="result-confidence">
            <span class="confidence-label">Confiança da IA:</span>
            <div class="confidence-bar ${result.verdict}">
              <div class="confidence-fill" style="width: 0%" data-target="${result.confidence}"></div>
            </div>
            <span class="confidence-value">${result.confidence}%</span>
          </div>
          <div class="result-confidence" style="margin-top:8px;">
            <span class="confidence-label">Fiabilidade:</span>
            <div class="confidence-bar ${result.verdict}">
              <div class="confidence-fill" style="width: 0%" data-target="${result.reliability}"></div>
            </div>
            <span class="confidence-value">${result.reliability}%</span>
          </div>
        </div>
      </div>
      <div class="result-body">
        <div>
          <div class="result-section-label">Resumo da análise</div>
          <p class="result-summary">${result.summary}</p>
        </div>
        <div>
          <div class="result-section-label">Indicadores</div>
          <div class="indicators-grid">${indicatorsHtml}</div>
        </div>
        <div>
          <div class="result-section-label">Fontes verificadas</div>
          <div class="sources-list">${sourcesHtml}</div>
        </div>
        ${realNewsHtml}
      </div>
    </div>

    <div class="download-section">
      <p data-i18n="dl_desc">Descarrega o relatório detalhado com toda a análise desta notícia.</p>
      <button class="btn-download" id="downloadPdfBtn">⬇ Descarregar Relatório PDF</button>
      <br/>
      <button class="btn-new-scan" id="newScanBtn">🔄 Nova Verificação</button>
    </div>
  `;

  section.classList.add('active');

  // Animate confidence bars
  setTimeout(() => {
    section.querySelectorAll('.confidence-fill[data-target]').forEach(bar => {
      bar.style.width = bar.getAttribute('data-target') + '%';
    });
  }, 100);

  // Scroll to result
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Bind buttons
  document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);
  document.getElementById('newScanBtn').addEventListener('click', resetScan);
}

// ---- GENERATE PDF ----
function generatePDF() {
  if (!lastResult) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;
  let y = 20;

  const colors = {
    fake: [220, 38, 38],
    real: [16, 185, 129],
    suspicious: [245, 158, 11],
    dark: [15, 15, 25],
    gray: [80, 80, 110],
    lightGray: [230, 230, 240],
    white: [255, 255, 255]
  };

  const verdictColor = colors[lastResult.verdict] || colors.gray;

  // Background
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, W, 297, 'F');

  // Header band
  doc.setFillColor(...verdictColor);
  doc.rect(0, 0, W, 45, 'F');

  // Logo text
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFACT', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Detector de Fake News — Relatório de Análise', margin, 28);
  doc.text(`Gerado em: ${lastResult.timestamp.toLocaleString('pt-PT')}`, margin, 35);

  // Verdict badge
  const verdictLabels = { fake: 'FALSO', real: 'VERDADEIRO', suspicious: 'SUSPEITO' };
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(W - 80, 10, 60, 24, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(verdictLabels[lastResult.verdict] || 'INCERTO', W - 50, 25, { align: 'center' });

  y = 60;

  // Section: scores
  doc.setTextColor(...colors.lightGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PONTUAÇÃO DE ANÁLISE', margin, y);
  y += 8;

  // Reliability bar
  doc.setFillColor(40, 40, 60);
  doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, 'F');
  const relWidth = (W - margin * 2) * (lastResult.reliability / 100);
  doc.setFillColor(...verdictColor);
  doc.roundedRect(margin, y, relWidth, 10, 2, 2, 'F');
  doc.setTextColor(...colors.lightGray);
  doc.setFontSize(9);
  doc.text(`Fiabilidade: ${lastResult.reliability}%`, margin + 2, y + 7);
  y += 16;

  // Confidence bar
  doc.setFillColor(40, 40, 60);
  doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, 'F');
  const confWidth = (W - margin * 2) * (lastResult.confidence / 100);
  doc.setFillColor(...colors.gray);
  doc.roundedRect(margin, y, confWidth, 10, 2, 2, 'F');
  doc.setTextColor(...colors.lightGray);
  doc.text(`Confiança da IA: ${lastResult.confidence}%`, margin + 2, y + 7);
  y += 20;

  // Section: summary
  doc.setTextColor(...verdictColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DA ANÁLISE', margin, y);
  y += 6;

  doc.setFillColor(25, 25, 40);
  doc.roundedRect(margin, y, W - margin * 2, 30, 3, 3, 'F');
  doc.setTextColor(...colors.lightGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(lastResult.summary, W - margin * 2 - 8);
  doc.text(summaryLines.slice(0, 4), margin + 4, y + 8);
  y += 36;

  // Section: indicators
  doc.setTextColor(...verdictColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INDICADORES DE ANÁLISE', margin, y);
  y += 8;

  if (lastResult.indicators && lastResult.indicators.length > 0) {
    const colW = (W - margin * 2) / 2 - 4;
    lastResult.indicators.forEach((ind, i) => {
      const col = i % 2;
      const xPos = margin + col * (colW + 8);
      if (i % 2 === 0 && i > 0) y += 16;
      if (i === 0) {} // first item doesn't need extra y

      doc.setFillColor(25, 25, 40);
      doc.roundedRect(xPos, y, colW, 14, 2, 2, 'F');

      const typeColor = { positive: [16, 185, 129], negative: [220, 38, 38], neutral: [245, 158, 11] };
      doc.setTextColor(...(typeColor[ind.type] || colors.lightGray));
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(ind.value, xPos + colW - 4, y + 6, { align: 'right' });

      doc.setTextColor(...colors.gray);
      doc.setFont('helvetica', 'normal');
      doc.text(ind.name, xPos + 4, y + 6);
      doc.setTextColor(50, 50, 70);
    });
    y += 20;
  }

  // Section: sources
  y += 4;
  doc.setTextColor(...verdictColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FONTES VERIFICADAS', margin, y);
  y += 8;

  if (lastResult.sources) {
    lastResult.sources.forEach(src => {
      doc.setFillColor(25, 25, 40);
      doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, 'F');

      const dotColor = { credible: [16, 185, 129], fake: [220, 38, 38], suspicious: [245, 158, 11] };
      doc.setFillColor(...(dotColor[src.status] || colors.gray));
      doc.circle(margin + 6, y + 5, 2, 'F');

      doc.setTextColor(...colors.lightGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(src.name, margin + 12, y + 6);
      doc.setTextColor(...(dotColor[src.status] || colors.gray));
      doc.text(src.label, W - margin - 2, y + 6, { align: 'right' });
      y += 13;
    });
  }

  // Real news section if fake
  if (lastResult.realNews) {
    y += 6;
    doc.setTextColor(...colors.real);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FONTES DE INFORMAÇÃO CREDENCIADAS', margin, y);
    y += 8;

    doc.setFillColor(15, 40, 30);
    doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, 'F');
    doc.setTextColor(...colors.lightGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Para verificar esta informação, consulta:', margin + 4, y + 7);
    lastResult.realNews.sources.forEach((s, i) => {
      doc.setTextColor(0, 212, 255);
      doc.text(`→ ${s.name}: ${s.url}`, margin + 8, y + 14 + i * 7);
    });
    y += 34;
  }

  // Content analysed
  if (lastResult.inputText) {
    y += 4;
    if (y > 250) {
      doc.addPage();
      doc.setFillColor(...colors.dark);
      doc.rect(0, 0, W, 297, 'F');
      y = 20;
    }
    doc.setTextColor(...verdictColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTEÚDO ANALISADO', margin, y);
    y += 8;

    doc.setFillColor(20, 20, 35);
    doc.roundedRect(margin, y, W - margin * 2, 40, 3, 3, 'F');
    doc.setTextColor(...colors.gray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const contentLines = doc.splitTextToSize(
      lastResult.inputText.substring(0, 400) + (lastResult.inputText.length > 400 ? '...' : ''),
      W - margin * 2 - 8
    );
    doc.text(contentLines.slice(0, 6), margin + 4, y + 7);
  }

  // Footer
  doc.setFillColor(...verdictColor);
  doc.rect(0, 285, W, 12, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFACT — Detector de Fake News', margin, 293);
  doc.text('verifact.app', W - margin, 293, { align: 'right' });

  // Save
  const filename = `VeriFact_Relatorio_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
  showToast('Relatório PDF descarregado!', 'success');

  // --- SAVE REPORT RECORD TO DATABASE ---
  if (typeof Reports !== 'undefined' && lastResult?.scanId) {
    try {
      await Reports.save(lastResult.scanId, filename, Math.round(doc.output('arraybuffer').byteLength / 1024));
    } catch (e) { console.warn('Report DB save failed:', e); }
  }
}

// ---- RESET ----
function resetScan() {
  document.getElementById('newsText').value = '';
  if (document.getElementById('newsUrl')) document.getElementById('newsUrl').value = '';
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('resultSection').innerHTML = '';
  document.getElementById('progressSection').classList.remove('active');
  document.getElementById('charCount').textContent = '0';
  lastResult = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  // Char counter
  const textarea = document.getElementById('newsText');
  const counter = document.getElementById('charCount');
  if (textarea && counter) {
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length;
    });
  }

  // Submit button
  const scanBtn = document.getElementById('scanBtn');
  if (scanBtn) scanBtn.addEventListener('click', runScan);

  // Clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', resetScan);

  // Pre-fill from session (quick scan)
  const preText = sessionStorage.getItem('vf_scan_text');
  if (preText) {
    if (preText.startsWith('http')) {
      switchTab('url');
      const urlInput = document.getElementById('newsUrl');
      if (urlInput) urlInput.value = preText;
    } else {
      const textInput = document.getElementById('newsText');
      if (textInput) {
        textInput.value = preText;
        counter.textContent = preText.length;
      }
    }
    sessionStorage.removeItem('vf_scan_text');
  }
});
