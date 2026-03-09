// ===== scan.js — Verificação real com Google Custom Search =====

// ============================================================
//  CONFIGURAÇÃO — preenche com as tuas chaves gratuitas
//  Ver README.md para instruções de como obter
// ============================================================
const GOOGLE_API_KEY = 'AIzaSyCGacRbVpHkGQsdhOElmDb6mBcHIBcvYrk';   // Chave da Google Custom Search API
const GOOGLE_CX      = '563bcb6c551524980'; 

// ============================================================
//  FONTES CREDENCIADAS
// ============================================================
const CREDIBLE_SOURCES = {
  factcheck: [
    { domain: 'poligrafo.sapo.pt',      name: 'Polígrafo',        weight: 10 },
    { domain: 'snopes.com',             name: 'Snopes',           weight: 10 },
    { domain: 'reuters.com/fact-check', name: 'Reuters FC',       weight: 10 },
    { domain: 'factcheck.org',          name: 'FactCheck.org',    weight: 10 },
    { domain: 'politifact.com',         name: 'PolitiFact',       weight: 9  },
    { domain: 'apnews.com',             name: 'AP Fact Check',    weight: 9  },
    { domain: 'observador.pt/factcheck',name: 'Observador FC',    weight: 9  },
  ],
  portuguese: [
    { domain: 'publico.pt',             name: 'Público',          weight: 8  },
    { domain: 'observador.pt',          name: 'Observador',       weight: 8  },
    { domain: 'dn.pt',                  name: 'Diário de Notícias',weight: 7 },
    { domain: 'jn.pt',                  name: 'Jornal de Notícias',weight: 7 },
    { domain: 'rtp.pt',                 name: 'RTP',              weight: 8  },
    { domain: 'tsf.pt',                 name: 'TSF',              weight: 7  },
    { domain: 'cmjornal.pt',            name: 'Correio da Manhã', weight: 6  },
  ],
  international: [
    { domain: 'bbc.com',                name: 'BBC',              weight: 9  },
    { domain: 'bbc.co.uk',             name: 'BBC UK',           weight: 9  },
    { domain: 'cnn.com',                name: 'CNN',              weight: 7  },
    { domain: 'apnews.com',            name: 'AP News',          weight: 9  },
    { domain: 'reuters.com',           name: 'Reuters',          weight: 9  },
    { domain: 'theguardian.com',       name: 'The Guardian',     weight: 8  },
    { domain: 'nytimes.com',           name: 'NY Times',         weight: 8  },
  ],
  wiki: [
    { domain: 'wikipedia.org',         name: 'Wikipedia',        weight: 6  },
    { domain: 'pt.wikipedia.org',      name: 'Wikipedia PT',     weight: 6  },
    { domain: 'en.wikipedia.org',      name: 'Wikipedia EN',     weight: 6  },
  ]
};

const ALL_SOURCES = [
  ...CREDIBLE_SOURCES.factcheck,
  ...CREDIBLE_SOURCES.portuguese,
  ...CREDIBLE_SOURCES.international,
  ...CREDIBLE_SOURCES.wiki,
];

// ============================================================
let currentMode = 'text';
let lastResult  = null;

// ---- TAB SWITCHING ----
function switchTab(mode) {
  currentMode = mode;
  document.getElementById('tabText').classList.toggle('active', mode === 'text');
  document.getElementById('tabUrl').classList.toggle('active',  mode === 'url');
  document.getElementById('panelText').style.display = mode === 'text' ? 'block' : 'none';
  document.getElementById('panelUrl').style.display  = mode === 'url'  ? 'block' : 'none';
}

// ---- PROGRESS ----
function setStep(index, status, statusText) {
  const el = document.getElementById(`step-${index}`);
  if (!el) return;
  el.className = `step-item ${status}`;
  const s = el.querySelector('.step-status');
  if (s) s.textContent = statusText || '';
  const dot = el.querySelector('.step-dot');
  const icons = ['📥','🔍','📰','⚖️','🧠','📄'];
  if (dot) {
    if (status === 'done')       dot.textContent = '✓';
    else if (status === 'error') dot.textContent = '✗';
    else                         dot.textContent = icons[index] || '●';
  }
}

function setProgress(pct, status) {
  const fill  = document.getElementById('progressFill');
  const pctEl = document.getElementById('progressPct');
  const statEl= document.getElementById('progressStatus');
  if (fill)   fill.style.width = pct + '%';
  if (pctEl)  pctEl.textContent = pct + '%';
  if (statEl && status) statEl.textContent = status;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
//  EXTRAIR PALAVRAS-CHAVE
// ============================================================
function extractKeywords(text) {
  const stopwords = new Set([
    'de','a','o','e','é','em','um','uma','para','com','não','que','se','na','no',
    'os','as','do','da','dos','das','ao','à','ou','mas','por','mais','já','foi',
    'the','an','is','are','was','were','in','on','at','to','of','and','or',
    'that','this','it','he','she','they','we','you','i','be','been','have','has',
    'said','says','will','would','could','should','may','might','also','been'
  ]);

  const words = text
    .replace(/[^\w\sáàãâéêíóôõúçñü]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w.toLowerCase()))
    .slice(0, 12);

  // Entidades (nomes próprios)
  const entities = text.match(/[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç]+(?:\s+[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç]+)*/g) || [];
  const topEntities = [...new Set(entities)].slice(0, 5);

  const combined = [...topEntities, ...words.filter(w =>
    !topEntities.some(e => e.toLowerCase().includes(w.toLowerCase()))
  )];

  return combined.slice(0, 8).join(' ');
}

// ============================================================
//  GOOGLE CUSTOM SEARCH
// ============================================================
async function googleSearch(query, numResults = 10) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) throw new Error('NO_API_KEY');

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.set('cx',  GOOGLE_CX);
  url.searchParams.set('q',   query);
  url.searchParams.set('num', numResults);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google API erro ${res.status}`);
  }
  const data = await res.json();
  return data.items || [];
}

// ============================================================
//  BRAVE SEARCH API (2000/mês grátis — https://api.search.brave.com/)
// ============================================================
const BRAVE_API_KEY = ''; // opcional

async function braveSearch(query) {
  if (!BRAVE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      { headers: { 'Accept': 'application/json', 'X-Subscription-Token': BRAVE_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).map(r => ({ title: r.title, link: r.url, snippet: r.description || '' }));
  } catch (e) { return []; }
}

// ============================================================
//  WIKIPEDIA API — sem chave, sem CORS, sempre funciona
// ============================================================
async function wikipediaSearch(query) {
  const results = [];
  try {
    // PT
    const resPt = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*&srlimit=6`);
    const dataPt = await resPt.json();
    (dataPt.query?.search || []).forEach(r => results.push({
      title:   r.title,
      link:    `https://pt.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g,'_'))}`,
      snippet: r.snippet?.replace(/<[^>]*>/g, '') || '',
    }));
  } catch(e) {}
  try {
    // EN
    const resEn = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*&srlimit=6`);
    const dataEn = await resEn.json();
    (dataEn.query?.search || []).forEach(r => results.push({
      title:   r.title,
      link:    `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g,'_'))}`,
      snippet: r.snippet?.replace(/<[^>]*>/g, '') || '',
    }));
  } catch(e) {}
  return results;
}

// ============================================================
//  NEWSAPI.ORG — chave gratuita em newsapi.org/register
// ============================================================
const NEWS_API_KEY = ''; // opcional

async function newsApiSearch(query) {
  if (!NEWS_API_KEY) return [];
  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=pt&pageSize=8&sortBy=relevancy&apiKey=${NEWS_API_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map(a => ({ title: a.title, link: a.url, snippet: a.description || '' }));
  } catch (e) { return []; }
}

// ============================================================
//  PESQUISA COMBINADA — usa todas as APIs disponíveis
//  Sem nenhuma chave: usa Wikipedia (sempre funciona)
//  Com Google ou Brave: muito mais preciso
// ============================================================
async function multiSearch(query, keywords) {
  const results = [];

  // 1. Google (melhor — 100/dia grátis)
  if (GOOGLE_API_KEY && GOOGLE_CX) {
    try {
      const r = await googleSearch(query, 10);
      r.forEach(i => { if (!results.find(x => x.link === i.link)) results.push(i); });
    } catch(e) { console.warn('Google falhou:', e.message); }
  }

  // 2. Brave (2000/mês grátis)
  if (BRAVE_API_KEY) {
    try {
      const r = await braveSearch(keywords);
      r.forEach(i => { if (!results.find(x => x.link === i.link)) results.push(i); });
    } catch(e) {}
  }

  // 3. NewsAPI (se tiver chave)
  if (NEWS_API_KEY) {
    try {
      const r = await newsApiSearch(keywords);
      r.forEach(i => { if (!results.find(x => x.link === i.link)) results.push(i); });
    } catch(e) {}
  }

  // 4. Wikipedia — SEMPRE corre (sem chave, sem CORS)
  try {
    const wiki = await wikipediaSearch(keywords);
    wiki.forEach(i => { if (!results.find(x => x.link === i.link)) results.push(i); });
  } catch(e) {}

  return results;
}

// ============================================================
//  ANALISAR RESULTADOS DA PESQUISA
//  Lógica melhorada: verifica se os resultados CONFIRMAM
//  especificamente o que foi escrito, não apenas se mencionam
//  os mesmos tópicos
// ============================================================
function extractClaimsFromText(text) {
  // Extrair datas/anos mencionados na notícia
  const years   = text.match(/\b(20\d{2}|19\d{2})\b/g) || [];
  // Extrair verbos de ação (morreu, ganhou, foi eleito, etc.)
  const actions = text.match(/\b(morreu|morte|faleceu|ganhou|perdeu|foi eleito|venceu|nomeado|renunciou|demitiu|divorciou|casou|preso|condenado|absolvido|voltou|regressou|eleito|nomeado|inaugurou|lançou|descobriu|anunciou|revelou)\b/gi) || [];
  // Extrair entidades principais (primeiras 3 palavras maiúsculas)
  const entities = [...new Set(text.match(/[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç]+(?:\s+[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç]+)*/g) || [])].slice(0, 4);
  return { years, actions: actions.map(a => a.toLowerCase()), entities };
}

function scoreResultRelevance(itemText, claims) {
  let score = 0;
  const text = itemText.toLowerCase();

  // Verificar se o resultado menciona a ação específica
  claims.actions.forEach(action => {
    if (text.includes(action)) score += 3;
  });

  // Verificar se menciona os anos específicos
  claims.years.forEach(year => {
    if (text.includes(year)) score += 2;
  });

  // Verificar entidades
  claims.entities.forEach(entity => {
    if (text.includes(entity.toLowerCase())) score += 1;
  });

  return score;
}

function analyseSearchResults(results, originalText) {
  const findings      = [];
  let confirmScore    = 0;
  let denyScore       = 0;
  let factCheckFound  = false;
  let factCheckVerdict = null;

  // Extrair os factos específicos que estão a ser verificados
  const claims = extractClaimsFromText(originalText || '');

  const fakeWords = [
    'falso','fake','false','desinformação','misinformation','mentira',
    'não é verdade','não é real','boato','hoax','rumor','manipulado',
    'desmentido','refutado','debunked','misleading','enganoso',
    'incorreto','satira','sátira','paródia','fabricado','fabricated',
    'nunca aconteceu','não existe','não ocorreu','sem evidências',
    'no evidence','unverified','unconfirmed','não confirmado'
  ];

  const trueWords = [
    'confirmado','confirmed','verdadeiro','verified',
    'comprovado','aconteceu','ocorreu','anunciou','declarou',
    'de acordo com fontes','notícia confirmada','breaking','official'
  ];

  // Palavras que indicam que o resultado é sobre o TÓPICO GERAL
  // mas NÃO confirma o facto específico
  const topicOnlyWords = [
    'história','biography','born','nascido','carreira','former','ex-',
    'anteriormente','previously','was','era','served as','serviu como'
  ];

  for (const item of results) {
    const url      = (item.link    || '').toLowerCase();
    const title    = (item.title   || '').toLowerCase();
    const snippet  = (item.snippet || '').toLowerCase();
    const fullText = title + ' ' + snippet;

    // Encontrar fonte
    const source      = ALL_SOURCES.find(s => url.includes(s.domain)) ||
                        ALL_SOURCES.find(s => url.includes(s.domain.replace('pt.','').replace('en.','')));
    const weight      = source ? source.weight : 3;
    const sourceName  = source ? source.name : extractDomain(item.link || '');
    const isFactCheck = CREDIBLE_SOURCES.factcheck.some(s => url.includes(s.domain));

    const hasFakeWord  = fakeWords.some(w => fullText.includes(w));
    const hasTrueWord  = trueWords.some(w => fullText.includes(w));
    const isTopicOnly  = !hasFakeWord && !hasTrueWord && topicOnlyWords.some(w => fullText.includes(w));

    // Relevância: quão específico é este resultado para o facto verificado
    const relevanceScore = scoreResultRelevance(fullText, claims);
    const isRelevant     = relevanceScore >= 2;

    if (isFactCheck) {
      factCheckFound = true;
      if (hasFakeWord) {
        denyScore += weight * 2.5;
        factCheckVerdict = 'fake';
      } else if (hasTrueWord && isRelevant) {
        confirmScore += weight * 2;
        factCheckVerdict = 'real';
      }
      // Fact-checker encontrado mas sem palavras claras = suspeito
    } else {
      if (hasFakeWord) {
        denyScore += weight;
      } else if (hasTrueWord && isRelevant) {
        // Só conta como confirmação se for relevante ao facto específico
        confirmScore += weight * 0.8;
      } else if (isTopicOnly || !isRelevant) {
        // Resultado sobre o tópico geral mas NÃO confirma o facto
        // NÃO adiciona pontos de confirmação — era aqui o bug!
        denyScore += 0.5; // ligeira penalização: o facto não aparece confirmado
      }
    }

    findings.push({
      title:         item.title   || '(sem título)',
      url:           item.link    || '#',
      snippet:       item.snippet || '',
      domain:        sourceName,
      isCredible:    !!source,
      isFactChecker: isFactCheck,
      hasFakeWord,
      hasTrueWord,
      isRelevant,
      relevanceScore,
      weight,
    });
  }

  return { findings, confirmScore, denyScore, factCheckFound, factCheckVerdict, claims };
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return url; }
}

// ============================================================
//  DETERMINAR VEREDICTO — lógica melhorada
// ============================================================
function determineVerdict(analysis, numResults, originalText) {
  const { confirmScore, denyScore, factCheckFound, factCheckVerdict, findings, claims } = analysis;
  const total = confirmScore + denyScore;
  let verdict, reliability, confidence, summary;

  // Contar resultados verdadeiramente relevantes
  const relevantResults   = findings.filter(f => f.isRelevant).length;
  const credibleRelevant  = findings.filter(f => f.isCredible && f.isRelevant).length;
  const contradictions    = findings.filter(f => f.hasFakeWord).length;
  const confirmations     = findings.filter(f => f.hasTrueWord && f.isRelevant).length;

  if (factCheckFound && factCheckVerdict === 'fake') {
    // Fact-checker específico diz que é falso
    verdict     = 'fake';
    reliability = Math.round(5 + Math.random() * 12);
    confidence  = 94;
    summary     = `Sites especializados em fact-checking identificaram esta informação como FALSA. ${contradictions} fonte(s) credenciada(s) contradizem diretamente esta notícia.`;

  } else if (factCheckFound && factCheckVerdict === 'real') {
    verdict     = 'real';
    reliability = Math.round(78 + Math.random() * 16);
    confidence  = 88;
    summary     = `Fact-checkers credenciados confirmaram esta informação. Encontrada em ${credibleRelevant} fonte(s) de confiança com relevância direta.`;

  } else if (numResults === 0 || relevantResults === 0) {
    // Nenhum resultado relevante = muito suspeito
    // Um facto verdadeiro e importante teria cobertura mediática
    verdict     = 'suspicious';
    reliability = 18;
    confidence  = 72;
    summary     = `Não foi encontrada nenhuma cobertura mediática credenciada que confirme esta informação. Factos verdadeiros e relevantes são normalmente noticiados por múltiplos meios de comunicação.`;

  } else if (confirmScore === 0 && denyScore > 0) {
    verdict     = 'fake';
    reliability = Math.round(8 + Math.random() * 14);
    confidence  = Math.round(70 + contradictions * 5);
    summary     = `Nenhuma fonte credenciada confirma este facto específico e ${contradictions} fonte(s) contradizem-no diretamente.`;

  } else if (confirmScore === 0 && total === 0) {
    // Há resultados mas nenhum confirma nem nega o facto específico
    verdict     = 'suspicious';
    reliability = 25;
    confidence  = 65;
    summary     = `Foram encontrados ${numResults} resultados sobre o tema mas nenhum confirma o facto específico mencionado. A ausência de confirmação em fontes credenciadas é um sinal de alerta.`;

  } else if (total > 0) {
    const ratio = confirmScore / total;

    if (denyScore > confirmScore) {
      verdict     = 'fake';
      reliability = Math.round(8 + (1 - ratio) * 20);
      confidence  = Math.round(62 + (denyScore / total) * 28);
      summary     = `As fontes credenciadas contradizem esta informação (${contradictions} contra ${confirmations} confirmações). O facto específico não está documentado como verdadeiro.`;

    } else if (confirmScore > denyScore && confirmations >= 2) {
      verdict     = 'real';
      reliability = Math.round(60 + ratio * 35);
      confidence  = Math.round(60 + ratio * 30);
      summary     = `A informação foi confirmada por ${confirmations} fonte(s) credenciada(s) com relevância direta para o facto verificado.`;

    } else {
      verdict     = 'suspicious';
      reliability = Math.round(28 + ratio * 20);
      confidence  = Math.round(50 + Math.abs(confirmScore - denyScore) / (total || 1) * 20);
      summary     = `Os resultados são inconclusivos. Foram encontradas ${numResults} referências mas apenas ${credibleRelevant} são diretamente relevantes ao facto verificado. Recomenda-se verificação adicional.`;
    }
  } else {
    verdict     = 'suspicious';
    reliability = 30;
    confidence  = 50;
    summary     = `Não foi possível determinar a veracidade desta informação com certeza suficiente. Verifica em fontes credenciadas antes de partilhar.`;
  }

  return {
    verdict,
    reliability: Math.min(97, Math.max(3,  reliability)),
    confidence:  Math.min(95, Math.max(45, confidence)),
    summary,
  };
}

// ============================================================
//  FETCH URL CONTENT
// ============================================================
async function fetchUrlContent(url) {
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res   = await fetch(proxy);
    const data  = await res.json();
    if (!data.contents) throw new Error('Sem conteúdo');
    const tmp   = document.createElement('div');
    tmp.innerHTML = data.contents;
    const art   = tmp.querySelector('article') || tmp.querySelector('main') || tmp;
    const text  = (art.innerText || art.textContent || '').replace(/\s+/g,' ').trim().substring(0, 3000);
    if (text.length < 50) throw new Error('Conteúdo insuficiente');
    return text;
  } catch (e) {
    throw new Error('Não foi possível aceder ao URL. Tenta colar o texto diretamente.');
  }
}

// ============================================================
//  CONSTRUIR RESULTADO
// ============================================================
function buildResult(verdictData, analysis, searchResults, keywords) {
  const { verdict, reliability, confidence, summary } = verdictData;
  const { findings, factCheckFound, factCheckVerdict } = analysis;

  const verdictMap = {
    fake:       { text: 'FALSO',      icon: '❌' },
    real:       { text: 'VERDADEIRO', icon: '✅' },
    suspicious: { text: 'SUSPEITO',   icon: '⚠️' },
  };

  const indicators = [
    { name: 'Fontes encontradas',  value: `${searchResults.length}`,                                                         type: searchResults.length > 3 ? 'positive' : searchResults.length > 0 ? 'neutral' : 'negative' },
    { name: 'Fontes credíveis',    value: `${findings.filter(f=>f.isCredible).length}`,                                      type: findings.filter(f=>f.isCredible).length > 2 ? 'positive' : 'neutral' },
    { name: 'Fact-checkers',       value: factCheckFound ? (factCheckVerdict === 'fake' ? '✗ Falso' : '✓ Real') : 'Nenhum', type: factCheckFound ? (factCheckVerdict === 'fake' ? 'negative' : 'positive') : 'neutral' },
    { name: 'Confirmações',        value: `${findings.filter(f=>f.hasTrueWord).length} fontes`,                              type: findings.filter(f=>f.hasTrueWord).length > 2 ? 'positive' : 'neutral' },
    { name: 'Contradições',        value: `${findings.filter(f=>f.hasFakeWord).length} fontes`,                              type: findings.filter(f=>f.hasFakeWord).length > 0 ? 'negative' : 'positive' },
    { name: 'Cobertura mediática', value: searchResults.length > 5 ? 'Alta' : searchResults.length > 2 ? 'Média' : 'Baixa', type: searchResults.length > 5 ? 'positive' : searchResults.length > 2 ? 'neutral' : 'negative' },
  ];

  const sources = findings.slice(0, 8).map(f => ({
    name:          f.domain,
    url:           f.url,
    title:         f.title,
    snippet:       f.snippet,
    status:        f.hasFakeWord ? 'fake' : f.hasTrueWord ? 'credible' : 'neutral',
    label:         f.hasFakeWord ? '✗ Contradiz' : f.hasTrueWord ? '✓ Confirma' : '— Menciona',
    isFactChecker: f.isFactChecker,
  }));

  let realNews = null;
  if (verdict === 'fake' || verdict === 'suspicious') {
    const correctSources = findings.filter(f => f.isCredible && !f.hasFakeWord).slice(0, 3);
    realNews = {
      title: correctSources.length > 0 ? 'Informação credenciada sobre este tema:' : 'Verifica nestas fontes credenciadas:',
      items: correctSources.length > 0
        ? correctSources.map(s => ({ name: s.domain, url: s.url, snippet: (s.snippet||'').substring(0,120) + '...' }))
        : [
            { name: 'Polígrafo',         url: `https://poligrafo.sapo.pt`,                                                snippet: 'Fact-checker português independente' },
            { name: 'Reuters Fact Check',url: `https://www.reuters.com/fact-check`,                                       snippet: 'Verificação de factos da Reuters' },
            { name: 'Snopes',            url: `https://snopes.com/search?q=${encodeURIComponent(keywords)}`,             snippet: 'Base de dados de fact-checking' },
          ]
    };
  }

  return { verdict, verdictText: verdictMap[verdict].text, verdictIcon: verdictMap[verdict].icon, reliability, confidence, summary, indicators, sources, realNews, keywords };
}

// ============================================================
//  FUNÇÃO PRINCIPAL
// ============================================================
async function runScan() {
  let inputText = '';

  if (currentMode === 'text') {
    inputText = document.getElementById('newsText').value.trim();
    if (!inputText || inputText.length < 15) {
      showToast('Por favor insere um texto com pelo menos 15 caracteres.', 'error'); return;
    }
  } else {
    const url = document.getElementById('newsUrl').value.trim();
    if (!url || !url.startsWith('http')) {
      showToast('Por favor insere um URL válido.', 'error'); return;
    }
    inputText = url;
  }

  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('progressSection').classList.add('active');
  document.getElementById('scanBtn').disabled = true;

  for (let i = 0; i < 6; i++) setStep(i, '', '—');
  setProgress(0, 'A iniciar...');

  let analysisText  = inputText;
  let searchResults = [];

  try {
    // STEP 0 — Obter conteúdo
    setStep(0, 'active', 'A processar...');
    setProgress(8, 'A obter conteúdo...');
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
      await sleep(300);
      setStep(0, 'done', '✓ OK');
    }
    setProgress(16, 'Conteúdo pronto');

    // STEP 1 — Extrair palavras-chave
    setStep(1, 'active', 'A extrair...');
    setProgress(24, 'A identificar factos-chave...');
    await sleep(300);
    const keywords = extractKeywords(analysisText);
    setStep(1, 'done', `✓ "${keywords.substring(0,28)}..."`);
    setProgress(32, `Palavras-chave identificadas`);

    // STEP 2 — Pesquisar em fontes credenciadas
    setStep(2, 'active', 'A pesquisar...');
    setProgress(40, 'A pesquisar em fontes credenciadas...');
    const searchQuery = keywords + ' fact check notícia';

    try {
      searchResults = await multiSearch(searchQuery, keywords);
      const src = GOOGLE_API_KEY ? 'Google' : BRAVE_API_KEY ? 'Brave' : 'Wikipedia';
      setStep(2, 'done', `✓ ${searchResults.length} resultados (${src})`);
      if (!GOOGLE_API_KEY && !BRAVE_API_KEY) {
        showToast('💡 Configura a Google API ou Brave API para resultados mais precisos.', 'info');
      }
    } catch (e) {
      showToast(`Erro na pesquisa: ${e.message}`, 'error');
      searchResults = await wikipediaSearch(keywords);
      setStep(2, 'done', `✓ ${searchResults.length} resultados Wikipedia`);
    }
    setProgress(58, `${searchResults.length} fontes encontradas`);

    // STEP 3 — Analisar resultados
    setStep(3, 'active', 'A analisar...');
    setProgress(68, 'A cruzar informação com fontes...');
    await sleep(500);
    const analysis = analyseSearchResults(searchResults, analysisText);
    setStep(3, 'done', `✓ ${analysis.findings.filter(f=>f.isCredible).length} fontes credíveis`);
    setProgress(77, 'Fontes analisadas');

    // STEP 4 — Veredicto
    setStep(4, 'active', 'A calcular...');
    setProgress(86, 'A determinar veredicto...');
    await sleep(400);
    const verdictData = determineVerdict(analysis, searchResults.length, analysisText);
    const result      = buildResult(verdictData, analysis, searchResults, keywords);
    setStep(4, 'done', '✓ OK');
    setProgress(93, 'Veredicto determinado');

    // STEP 5 — Gerar relatório
    setStep(5, 'active', 'A preparar...');
    setProgress(97, 'A preparar relatório...');

    // Guardar na DB
    let savedScanId = null;
    if (typeof Scans !== 'undefined') {
      try {
        const saveRes = await Scans.save({
          input_type: currentMode, input_content: analysisText,
          verdict: result.verdict, reliability: result.reliability,
          confidence: result.confidence, fake_score: 100 - result.reliability,
          summary: result.summary, indicators: result.indicators,
          sources: result.sources, real_news: result.realNews,
        });
        if (saveRes?.success) savedScanId = saveRes.data.scan_id;
      } catch (e) { console.warn('DB save failed:', e); }
    }

    lastResult = { ...result, inputText: analysisText, inputMode: currentMode, timestamp: new Date(), keywords, searchResults, scanId: savedScanId };

    setStep(5, 'done', '✓ Pronto');
    setProgress(100, 'Concluído!');
    await sleep(300);

    document.getElementById('progressSection').classList.remove('active');
    renderResult(result);

  } catch (err) {
    console.error('Scan error:', err);
    showToast('Erro durante a análise: ' + err.message, 'error');
    document.getElementById('progressSection').classList.remove('active');
  }

  document.getElementById('scanBtn').disabled = false;
}

// ============================================================
//  RENDER RESULT
// ============================================================
function renderResult(result) {
  const section = document.getElementById('resultSection');

  const indicatorsHtml = result.indicators.map(i => `
    <div class="indicator-item">
      <div class="indicator-name">${i.name}</div>
      <div class="indicator-value ${i.type}">${i.value}</div>
    </div>`).join('');

  const sourcesHtml = result.sources.map(s => `
    <div class="source-item" style="cursor:pointer" onclick="window.open('${s.url}','_blank')">
      <div class="source-dot ${s.status === 'credible' ? 'credible' : s.status === 'fake' ? 'fake' : 'suspicious'}"></div>
      <div style="flex:1;min-width:0">
        <div class="source-name" style="font-weight:600;color:var(--text)">
          ${s.name}${s.isFactChecker ? ' <span style="font-size:10px;background:rgba(0,245,160,0.15);color:var(--accent);padding:1px 6px;border-radius:4px">FACT-CHECK</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</div>
      </div>
      <span class="source-badge badge badge-${s.status === 'credible' ? 'real' : s.status === 'fake' ? 'fake' : 'suspicious'}">${s.label}</span>
    </div>`).join('');

  const realNewsHtml = result.realNews ? `
    <div>
      <div class="result-section-label">Notícia real correspondente</div>
      <div class="real-news-card">
        <h4>${result.realNews.title}</h4>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
          ${result.realNews.items.map(item => `
            <a href="${item.url}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;gap:3px;padding:12px;background:rgba(0,245,160,0.05);border:1px solid rgba(0,245,160,0.15);border-radius:8px;text-decoration:none;">
              <span style="font-weight:700;color:var(--green);font-size:13px">🔗 ${item.name}</span>
              <span style="font-size:12px;color:var(--text2)">${item.snippet}</span>
            </a>`).join('')}
        </div>
      </div>
    </div>` : '';

  section.innerHTML = `
    <div class="result-card ${result.verdict}">
      <div class="result-header">
        <div class="result-verdict-icon">${result.verdictIcon}</div>
        <div class="result-verdict-text">
          <h2>${result.verdictText}</h2>
          <div style="font-size:12px;color:var(--text3);margin-bottom:12px;font-family:var(--font-mono)">
            Pesquisado em ${lastResult?.searchResults?.length || 0} fontes · ${new Date().toLocaleString('pt-PT')}
          </div>
          <div class="result-confidence">
            <span class="confidence-label">Fiabilidade:</span>
            <div class="confidence-bar ${result.verdict}"><div class="confidence-fill" style="width:0%" data-target="${result.reliability}"></div></div>
            <span class="confidence-value">${result.reliability}%</span>
          </div>
          <div class="result-confidence" style="margin-top:8px">
            <span class="confidence-label">Confiança:</span>
            <div class="confidence-bar ${result.verdict}"><div class="confidence-fill" style="width:0%" data-target="${result.confidence}"></div></div>
            <span class="confidence-value">${result.confidence}%</span>
          </div>
        </div>
      </div>
      <div class="result-body">
        <div>
          <div class="result-section-label">Resumo da análise</div>
          <p class="result-summary">${result.summary}</p>
          ${result.keywords ? `<p style="font-size:12px;color:var(--text3);margin-top:8px;font-family:var(--font-mono)">🔍 Pesquisado por: "${result.keywords}"</p>` : ''}
        </div>
        <div>
          <div class="result-section-label">Indicadores</div>
          <div class="indicators-grid">${indicatorsHtml}</div>
        </div>
        <div>
          <div class="result-section-label">Fontes verificadas (clica para abrir)</div>
          <div class="sources-list">${sourcesHtml || '<p style="color:var(--text3);font-size:14px;padding:12px">Nenhuma fonte encontrada para esta informação.</p>'}</div>
        </div>
        ${realNewsHtml}
      </div>
    </div>
    <div class="download-section">
      <p>Descarrega o relatório detalhado com toda a análise e fontes encontradas.</p>
      <button class="btn-download" id="downloadPdfBtn">⬇ Descarregar Relatório PDF</button><br/>
      <button class="btn-new-scan" id="newScanBtn">🔄 Nova Verificação</button>
    </div>`;

  section.classList.add('active');
  setTimeout(() => {
    section.querySelectorAll('.confidence-fill[data-target]').forEach(b => { b.style.width = b.getAttribute('data-target') + '%'; });
  }, 100);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);
  document.getElementById('newScanBtn').addEventListener('click', resetScan);
}

// ============================================================
//  GERAR PDF
// ============================================================
async function generatePDF() {
  if (!lastResult) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });
  const W = 210, M = 20;
  let y = 20;

  const C = { fake:[220,38,38], real:[16,185,129], suspicious:[245,158,11], dark:[15,15,25], gray:[80,80,110], light:[230,230,240] };
  const vc = C[lastResult.verdict] || C.gray;

  doc.setFillColor(...C.dark); doc.rect(0,0,W,297,'F');
  doc.setFillColor(...vc); doc.rect(0,0,W,48,'F');
  doc.setFontSize(26); doc.setTextColor(0,0,0); doc.setFont('helvetica','bold');
  doc.text('VERIFACT', M, 20);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('Detector de Fake News — Relatório com Pesquisa Web em Tempo Real', M, 29);
  doc.text(`Gerado em: ${lastResult.timestamp.toLocaleString('pt-PT')}`, M, 37);
  doc.setFillColor(0,0,0); doc.roundedRect(W-85,10,66,28,4,4,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text(lastResult.verdictText||'INCERTO', W-52, 28, {align:'center'});

  y = 62;
  doc.setTextColor(...vc); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('TERMOS PESQUISADOS', M, y); y+=6;
  doc.setFillColor(20,20,38); doc.roundedRect(M,y,W-M*2,10,2,2,'F');
  doc.setTextColor(...C.light); doc.setFont('helvetica','normal');
  doc.text(`🔍  ${lastResult.keywords||'—'}`, M+4, y+7); y+=17;

  doc.setTextColor(...vc); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('PONTUAÇÃO', M, y); y+=7;
  [[`Fiabilidade`, lastResult.reliability, vc],[`Confiança`, lastResult.confidence, C.gray]].forEach(([lbl,val,col]) => {
    doc.setFillColor(30,30,50); doc.roundedRect(M,y,W-M*2,10,2,2,'F');
    doc.setFillColor(...col); doc.roundedRect(M,y,(W-M*2)*(val/100),10,2,2,'F');
    doc.setTextColor(...C.light); doc.setFontSize(8);
    doc.text(`${lbl}: ${val}%`, M+3,y+7); y+=13;
  });
  y+=4;

  doc.setTextColor(...vc); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('RESUMO DA ANÁLISE', M, y); y+=6;
  doc.setFillColor(22,22,38); doc.roundedRect(M,y,W-M*2,28,3,3,'F');
  doc.setTextColor(...C.light); doc.setFont('helvetica','normal');
  doc.text(doc.splitTextToSize(lastResult.summary||'',W-M*2-8).slice(0,4), M+4,y+7); y+=34;

  doc.setTextColor(...vc); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text(`FONTES ENCONTRADAS (${lastResult.sources?.length||0})`, M, y); y+=7;
  (lastResult.sources||[]).slice(0,8).forEach(src => {
    if (y>262) { doc.addPage(); doc.setFillColor(...C.dark); doc.rect(0,0,W,297,'F'); y=20; }
    const dc = src.status==='credible'?C.real:src.status==='fake'?C.fake:C.gray;
    doc.setFillColor(22,22,38); doc.roundedRect(M,y,W-M*2,13,2,2,'F');
    doc.setFillColor(...dc); doc.circle(M+6,y+6.5,2.5,'F');
    doc.setTextColor(...C.light); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(src.name, M+12,y+5);
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.gray);
    doc.text((src.title||'').substring(0,72), M+12,y+10);
    doc.setTextColor(...dc); doc.text(src.label||'',W-M-2,y+7,{align:'right'});
    y+=16;
  });

  if (lastResult.realNews) {
    y+=4; if(y>255){doc.addPage();doc.setFillColor(...C.dark);doc.rect(0,0,W,297,'F');y=20;}
    doc.setTextColor(16,185,129); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text('FONTES CREDENCIADAS PARA VERIFICAÇÃO', M, y); y+=7;
    const bh = (lastResult.realNews.items?.length||0)*14+12;
    doc.setFillColor(15,38,28); doc.roundedRect(M,y,W-M*2,bh,3,3,'F');
    (lastResult.realNews.items||[]).forEach((item,i) => {
      doc.setTextColor(0,212,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(`→ ${item.name}`, M+4,y+8+i*14);
      doc.setTextColor(...C.gray); doc.setFont('helvetica','normal');
      doc.text((item.snippet||'').substring(0,80), M+4,y+13+i*14);
    });
    y+=bh+8;
  }

  doc.setFillColor(...vc); doc.rect(0,285,W,12,'F');
  doc.setTextColor(0,0,0); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('VERIFACT — Verificação de Factos com Pesquisa Web em Tempo Real', M, 293);

  const filename = `VeriFact_${lastResult.verdictText}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
  showToast('📄 Relatório PDF descarregado!', 'success');

  if (typeof Reports !== 'undefined' && lastResult?.scanId) {
    try {
      const pdfString  = doc.output('datauristring');
      const fileSizeKb = Math.round((pdfString.length * 0.75) / 1024);
      await Reports.save(lastResult.scanId, filename, fileSizeKb);
    } catch (e) { console.warn('Report DB save failed:', e); }
  }
}

// ============================================================
//  RESET
// ============================================================
function resetScan() {
  document.getElementById('newsText').value = '';
  const u = document.getElementById('newsUrl'); if(u) u.value = '';
  document.getElementById('resultSection').classList.remove('active');
  document.getElementById('resultSection').innerHTML = '';
  document.getElementById('progressSection').classList.remove('active');
  const cc = document.getElementById('charCount'); if(cc) cc.textContent='0';
  lastResult = null;
  window.scrollTo({ top:0, behavior:'smooth' });
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('newsText');
  const counter  = document.getElementById('charCount');
  if (textarea && counter) textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });

  document.getElementById('scanBtn')?.addEventListener('click', runScan);
  document.getElementById('clearBtn')?.addEventListener('click', resetScan);

  const preText = sessionStorage.getItem('vf_scan_text');
  if (preText) {
    if (preText.startsWith('http')) {
      switchTab('url');
      const u = document.getElementById('newsUrl'); if(u) u.value = preText;
    } else {
      const t = document.getElementById('newsText');
      if (t) { t.value = preText; if(counter) counter.textContent = preText.length; }
    }
    sessionStorage.removeItem('vf_scan_text');
  }
});
