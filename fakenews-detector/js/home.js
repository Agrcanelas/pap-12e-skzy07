// ===== home.js =====
const TRENDING_NEWS = [
  {
    title: "Governo anuncia novo plano de combate à desinformação nas redes sociais",
    source: "Público",
    snippet: "O executivo propõe novas medidas para regular plataformas digitais e combater a propagação de notícias falsas.",
    date: "Há 2 horas",
    verdict: "real",
    reliability: 91,
    category: "Política"
  },
  {
    title: "Vitamina C em doses altas cura cancro, diz estudo viral",
    source: "Blog Saúde Total",
    snippet: "Publicação viral afirma que tomar 10g de vitamina C diariamente elimina completamente células cancerígenas.",
    date: "Há 5 horas",
    verdict: "fake",
    reliability: 8,
    category: "Saúde"
  },
  {
    title: "Portugal entre os países com melhor qualidade de vida segundo novo ranking",
    source: "Jornal de Negócios",
    snippet: "Relatório internacional coloca Portugal em 14.º lugar a nível mundial em qualidade de vida.",
    date: "Há 8 horas",
    verdict: "real",
    reliability: 85,
    category: "Sociedade"
  },
  {
    title: "Cientistas descobrem que o 5G provoca alterações genéticas",
    source: "InfoAlternativa.net",
    snippet: "Suposto estudo afirma que a radiação das redes 5G modifica o ADN humano após exposição prolongada.",
    date: "Há 12 horas",
    verdict: "fake",
    reliability: 4,
    category: "Tecnologia"
  },
  {
    title: "Banco de Portugal alerta para novo esquema de phishing",
    source: "BdP",
    snippet: "Autoridade monetária avisa cidadãos sobre mensagens falsas que imitam comunicações oficiais bancárias.",
    date: "Ontem",
    verdict: "real",
    reliability: 97,
    category: "Economia"
  },
  {
    title: "Eleições presidenciais: candidato terá dito algo que nunca disse",
    source: "ViralPT.com",
    snippet: "Vídeo editado circula nas redes sociais atribuindo declarações falsas a figura política.",
    date: "Ontem",
    verdict: "suspicious",
    reliability: 32,
    category: "Política"
  }
];

let newsOffset = 0;
const NEWS_PER_LOAD = 6;

function getReliabilityClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function renderNewsCard(news) {
  const relClass = getReliabilityClass(news.reliability);
  const verdictLabel = {
    real: { text: '✓ VERDADEIRO', class: 'badge-real' },
    fake: { text: '✗ FALSO', class: 'badge-fake' },
    suspicious: { text: '⚠ SUSPEITO', class: 'badge-suspicious' }
  }[news.verdict] || { text: '? INCERTO', class: '' };

  return `
    <div class="news-card ${news.verdict}" onclick="goToScan('${encodeURIComponent(news.title)}')">
      <div class="news-card-header">
        <div>
          <div class="news-source">${news.source} · ${news.category}</div>
        </div>
        <span class="badge ${verdictLabel.class}">${verdictLabel.text}</span>
      </div>
      <div class="news-title">${news.title}</div>
      <div class="news-snippet">${news.snippet}</div>
      <div class="reliability-bar">
        <div class="reliability-fill ${relClass}" style="width: ${news.reliability}%"></div>
      </div>
      <div class="news-footer">
        <span class="news-date">${news.date}</span>
        <span style="font-size:12px;color:var(--text3);font-family:var(--font-mono)">${news.reliability}% confiável</span>
      </div>
    </div>
  `;
}

function goToScan(encodedTitle) {
  const title = decodeURIComponent(encodedTitle);
  sessionStorage.setItem('vf_scan_text', title);
  window.location.href = 'pages/scan.html';
}

function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  const slice = TRENDING_NEWS.slice(newsOffset, newsOffset + NEWS_PER_LOAD);
  
  if (newsOffset === 0) {
    // Remove skeletons
    grid.innerHTML = '';
  }
  
  slice.forEach((news, i) => {
    const card = document.createElement('div');
    card.innerHTML = renderNewsCard(news);
    card.firstElementChild.style.animationDelay = `${i * 0.1}s`;
    card.firstElementChild.style.animation = 'fadeUp 0.5s ease both';
    grid.appendChild(card.firstElementChild);
  });
  
  newsOffset += NEWS_PER_LOAD;
  
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn && newsOffset >= TRENDING_NEWS.length) {
    loadMoreBtn.style.display = 'none';
  }
}

// Quick scan redirect
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadNews, 600); // Simulate loading
  
  const quickBtn = document.getElementById('quickScanBtn');
  const quickInput = document.getElementById('quickInput');
  
  if (quickBtn && quickInput) {
    const doQuickScan = () => {
      const val = quickInput.value.trim();
      if (val) {
        sessionStorage.setItem('vf_scan_text', val);
      }
      window.location.href = 'pages/scan.html';
    };
    quickBtn.addEventListener('click', doQuickScan);
    quickInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doQuickScan();
    });
  }

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadNews);
  }
  
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.style.borderBottomColor = 'var(--border2)';
    } else {
      navbar.style.borderBottomColor = 'var(--border)';
    }
  });
});
