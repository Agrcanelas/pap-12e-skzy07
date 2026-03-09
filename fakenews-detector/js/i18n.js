// ===== i18n.js — Internationalisation =====
const translations = {
  pt: {
    nav_home: "Início", nav_scan: "Verificar", nav_login: "Entrar", nav_register: "Registar",
    hero_badge: "🔍 IA contra Desinformação",
    hero_title1: "DETECTA", hero_title2: "FAKE NEWS", hero_title3: "EM SEGUNDOS",
    hero_sub: "Cola uma notícia ou URL e descobre se é verdadeira ou falsa. Com relatório PDF completo.",
    hero_cta: "Verificar Agora →", hero_cta2: "Ver Notícias →",
    stat1: "Precisão", stat2: "Verificações", stat3: "Tempo médio",
    quick_placeholder: "Cola um texto ou URL aqui para verificação rápida...",
    quick_btn: "Verificar",
    trending_title: "📡 Notícias em Destaque", trending_sub: "Análise em tempo real das notícias mais partilhadas",
    load_more: "Carregar mais",
    how_title: "Como Funciona",
    step1_title: "Insere o conteúdo", step1_desc: "Cola o texto da notícia ou o URL do artigo que queres verificar.",
    step2_title: "IA analisa", step2_desc: "O nosso modelo de IA verifica fontes, linguagem e padrões de desinformação.",
    step3_title: "Recebe o relatório", step3_desc: "Descarrega o relatório completo em PDF com a análise detalhada.",
    footer_tagline: "Combatendo a desinformação com inteligência artificial.", footer_built: "Feito com IA",
    scan_title: "Verificador de Notícias", scan_sub: "Descobre se uma notícia é verdadeira ou falsa com IA",
    tab_text: "📝 Texto", tab_url: "🔗 URL",
    text_placeholder: "Cola aqui o texto da notícia que queres verificar...",
    url_placeholder: "https://exemplo.com/artigo-da-noticia",
    btn_verify: "🔍 Verificar Agora", btn_clear: "Limpar",
    progress_title: "A analisar o conteúdo...",
    step_fetch: "Obter conteúdo", step_fetch_sub: "A recolher dados da notícia",
    step_lang: "Analisar linguagem", step_lang_sub: "Detetar padrões de desinformação",
    step_sources: "Verificar fontes", step_sources_sub: "Cruzar com bases de dados de factos",
    step_sentiment: "Análise de sentimento", step_sentiment_sub: "Avaliar o tom e emoções",
    step_verdict: "Determinar veredicto", step_verdict_sub: "Calcular pontuação final",
    step_report: "Gerar relatório", step_report_sub: "Preparar PDF com resultados",
    result_summary_lbl: "Resumo da análise",
    result_indicators_lbl: "Indicadores",
    result_sources_lbl: "Fontes verificadas",
    result_real_lbl: "Notícia real correspondente",
    dl_title: "Relatório PDF Completo", dl_desc: "Descarrega o relatório detalhado com toda a análise desta notícia.",
    btn_download: "⬇ Descarregar Relatório PDF", btn_new_scan: "🔄 Nova Verificação",
    login_title: "Bem-vindo de volta", login_sub: "Não tens conta? ", login_sub2: "Regista-te",
    login_btn: "Entrar", forgot_pw: "Esqueceste a palavra-passe?",
    register_title: "Criar conta", register_sub: "Já tens conta? ", register_sub2: "Entrar",
    register_btn: "Criar Conta",
    label_name: "Nome completo", label_email: "Email", label_password: "Palavra-passe", label_confirm: "Confirmar palavra-passe",
    ph_name: "O teu nome", ph_email: "email@exemplo.com", ph_password: "Palavra-passe segura", ph_confirm: "Confirmar palavra-passe",
  },
  en: {
    nav_home: "Home", nav_scan: "Verify", nav_login: "Sign in", nav_register: "Register",
    hero_badge: "🔍 AI against Disinformation",
    hero_title1: "DETECT", hero_title2: "FAKE NEWS", hero_title3: "IN SECONDS",
    hero_sub: "Paste a news article or URL and find out if it's true or false. With full PDF report.",
    hero_cta: "Verify Now →", hero_cta2: "See News →",
    stat1: "Accuracy", stat2: "Verifications", stat3: "Average time",
    quick_placeholder: "Paste a text or URL here for quick verification...",
    quick_btn: "Verify",
    trending_title: "📡 Trending News", trending_sub: "Real-time analysis of the most shared news",
    load_more: "Load more",
    how_title: "How It Works",
    step1_title: "Insert content", step1_desc: "Paste the news text or article URL you want to verify.",
    step2_title: "AI analyzes", step2_desc: "Our AI model checks sources, language and disinformation patterns.",
    step3_title: "Get the report", step3_desc: "Download the complete PDF report with detailed analysis.",
    footer_tagline: "Fighting disinformation with artificial intelligence.", footer_built: "Made with AI",
    scan_title: "News Verifier", scan_sub: "Find out if a news article is true or false with AI",
    tab_text: "📝 Text", tab_url: "🔗 URL",
    text_placeholder: "Paste the news text you want to verify here...",
    url_placeholder: "https://example.com/news-article",
    btn_verify: "🔍 Verify Now", btn_clear: "Clear",
    progress_title: "Analysing content...",
    step_fetch: "Fetch content", step_fetch_sub: "Collecting news data",
    step_lang: "Language analysis", step_lang_sub: "Detecting disinformation patterns",
    step_sources: "Verify sources", step_sources_sub: "Cross-referencing fact databases",
    step_sentiment: "Sentiment analysis", step_sentiment_sub: "Evaluating tone and emotions",
    step_verdict: "Determine verdict", step_verdict_sub: "Calculating final score",
    step_report: "Generate report", step_report_sub: "Preparing PDF with results",
    result_summary_lbl: "Analysis summary",
    result_indicators_lbl: "Indicators",
    result_sources_lbl: "Verified sources",
    result_real_lbl: "Corresponding real news",
    dl_title: "Complete PDF Report", dl_desc: "Download the detailed report with the full analysis of this news.",
    btn_download: "⬇ Download PDF Report", btn_new_scan: "🔄 New Verification",
    login_title: "Welcome back", login_sub: "No account? ", login_sub2: "Register",
    login_btn: "Sign in", forgot_pw: "Forgot password?",
    register_title: "Create account", register_sub: "Already have an account? ", register_sub2: "Sign in",
    register_btn: "Create Account",
    label_name: "Full name", label_email: "Email", label_password: "Password", label_confirm: "Confirm password",
    ph_name: "Your name", ph_email: "email@example.com", ph_password: "Strong password", ph_confirm: "Confirm password",
  },
  es: {
    nav_home: "Inicio", nav_scan: "Verificar", nav_login: "Entrar", nav_register: "Registrarse",
    hero_badge: "🔍 IA contra la Desinformación",
    hero_title1: "DETECTA", hero_title2: "FAKE NEWS", hero_title3: "EN SEGUNDOS",
    hero_sub: "Pega una noticia o URL y descubre si es verdadera o falsa. Con informe PDF completo.",
    hero_cta: "Verificar Ahora →", hero_cta2: "Ver Noticias →",
    stat1: "Precisión", stat2: "Verificaciones", stat3: "Tiempo medio",
    quick_placeholder: "Pega un texto o URL aquí para verificación rápida...",
    quick_btn: "Verificar",
    trending_title: "📡 Noticias Destacadas", trending_sub: "Análisis en tiempo real de las noticias más compartidas",
    load_more: "Cargar más",
    how_title: "Cómo Funciona",
    step1_title: "Inserta el contenido", step1_desc: "Pega el texto de la noticia o la URL del artículo.",
    step2_title: "IA analiza", step2_desc: "Nuestro modelo de IA verifica fuentes, lenguaje y patrones de desinformación.",
    step3_title: "Recibe el informe", step3_desc: "Descarga el informe completo en PDF.",
    footer_tagline: "Combatiendo la desinformación con inteligencia artificial.", footer_built: "Hecho con IA",
    scan_title: "Verificador de Noticias", scan_sub: "Descubre si una noticia es verdadera o falsa con IA",
    tab_text: "📝 Texto", tab_url: "🔗 URL",
    text_placeholder: "Pega aquí el texto de la noticia...",
    url_placeholder: "https://ejemplo.com/articulo",
    btn_verify: "🔍 Verificar Ahora", btn_clear: "Limpiar",
    progress_title: "Analizando el contenido...",
    step_fetch: "Obtener contenido", step_fetch_sub: "Recopilando datos de la noticia",
    step_lang: "Analizar lenguaje", step_lang_sub: "Detectar patrones de desinformación",
    step_sources: "Verificar fuentes", step_sources_sub: "Cruzar con bases de datos",
    step_sentiment: "Análisis de sentimiento", step_sentiment_sub: "Evaluar tono y emociones",
    step_verdict: "Determinar veredicto", step_verdict_sub: "Calcular puntuación final",
    step_report: "Generar informe", step_report_sub: "Preparar PDF con resultados",
    result_summary_lbl: "Resumen del análisis",
    result_indicators_lbl: "Indicadores",
    result_sources_lbl: "Fuentes verificadas",
    result_real_lbl: "Noticia real correspondiente",
    dl_title: "Informe PDF Completo", dl_desc: "Descarga el informe detallado con el análisis completo.",
    btn_download: "⬇ Descargar Informe PDF", btn_new_scan: "🔄 Nueva Verificación",
    login_title: "Bienvenido de nuevo", login_sub: "¿Sin cuenta? ", login_sub2: "Regístrate",
    login_btn: "Entrar", forgot_pw: "¿Olvidaste tu contraseña?",
    register_title: "Crear cuenta", register_sub: "¿Ya tienes cuenta? ", register_sub2: "Entrar",
    register_btn: "Crear Cuenta",
    label_name: "Nombre completo", label_email: "Correo", label_password: "Contraseña", label_confirm: "Confirmar contraseña",
    ph_name: "Tu nombre", ph_email: "correo@ejemplo.com", ph_password: "Contraseña segura", ph_confirm: "Confirmar contraseña",
  },
  fr: {
    nav_home: "Accueil", nav_scan: "Vérifier", nav_login: "Connexion", nav_register: "S'inscrire",
    hero_badge: "🔍 IA contre la Désinformation",
    hero_title1: "DÉTECTEZ", hero_title2: "LES FAUSSES", hero_title3: "NOUVELLES",
    hero_sub: "Collez un article ou une URL et découvrez s'il est vrai ou faux. Avec rapport PDF complet.",
    hero_cta: "Vérifier maintenant →", hero_cta2: "Voir les nouvelles →",
    stat1: "Précision", stat2: "Vérifications", stat3: "Temps moyen",
    quick_placeholder: "Collez un texte ou une URL ici...",
    quick_btn: "Vérifier",
    trending_title: "📡 Actualités en vedette", trending_sub: "Analyse en temps réel des nouvelles les plus partagées",
    load_more: "Charger plus",
    how_title: "Comment ça marche",
    step1_title: "Insérer le contenu", step1_desc: "Collez le texte de l'article ou l'URL.",
    step2_title: "L'IA analyse", step2_desc: "Notre modèle IA vérifie les sources et les patterns.",
    step3_title: "Recevoir le rapport", step3_desc: "Téléchargez le rapport PDF complet.",
    footer_tagline: "Lutter contre la désinformation avec l'intelligence artificielle.", footer_built: "Fait avec l'IA",
    scan_title: "Vérificateur de Nouvelles", scan_sub: "Découvrez si une nouvelle est vraie ou fausse avec l'IA",
    tab_text: "📝 Texte", tab_url: "🔗 URL",
    text_placeholder: "Collez ici le texte de la nouvelle...",
    url_placeholder: "https://exemple.com/article",
    btn_verify: "🔍 Vérifier maintenant", btn_clear: "Effacer",
    progress_title: "Analyse du contenu...",
    step_fetch: "Récupérer le contenu", step_fetch_sub: "Collecte des données",
    step_lang: "Analyser le langage", step_lang_sub: "Détecter les patterns",
    step_sources: "Vérifier les sources", step_sources_sub: "Croiser les bases de données",
    step_sentiment: "Analyse de sentiment", step_sentiment_sub: "Évaluer le ton",
    step_verdict: "Déterminer le verdict", step_verdict_sub: "Calculer le score final",
    step_report: "Générer le rapport", step_report_sub: "Préparer le PDF",
    result_summary_lbl: "Résumé de l'analyse",
    result_indicators_lbl: "Indicateurs",
    result_sources_lbl: "Sources vérifiées",
    result_real_lbl: "Vraie nouvelle correspondante",
    dl_title: "Rapport PDF Complet", dl_desc: "Téléchargez le rapport détaillé.",
    btn_download: "⬇ Télécharger le Rapport PDF", btn_new_scan: "🔄 Nouvelle Vérification",
    login_title: "Bon retour", login_sub: "Pas de compte ? ", login_sub2: "S'inscrire",
    login_btn: "Connexion", forgot_pw: "Mot de passe oublié ?",
    register_title: "Créer un compte", register_sub: "Déjà un compte ? ", register_sub2: "Connexion",
    register_btn: "Créer un Compte",
    label_name: "Nom complet", label_email: "Email", label_password: "Mot de passe", label_confirm: "Confirmer le mot de passe",
    ph_name: "Votre nom", ph_email: "email@exemple.com", ph_password: "Mot de passe sécurisé", ph_confirm: "Confirmer le mot de passe",
  }
};

let currentLang = localStorage.getItem('vf_lang') || 'pt';

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) ||
         (translations['pt'][key]) || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
  // Update html lang attr
  document.documentElement.lang = currentLang;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('vf_lang', lang);
  applyTranslations();
  // Close dropdown
  document.getElementById('langDropdown')?.classList.remove('open');
}

// Apply on load
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});
