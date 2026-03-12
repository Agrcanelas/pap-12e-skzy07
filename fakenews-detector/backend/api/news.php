<?php
// ============================================================
//  news.php — Notícias via múltiplas APIs (funciona em localhost)
//  Prioridade: GNews → NewsData.io → RSS feeds → Fallback estático
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ── CHAVES API ───────────────────────────────────────────────
// GNews: regista em https://gnews.io (100 pedidos/dia grátis, FUNCIONA em localhost)
define('NEWSAPI_KEY',  '527282a6bd1dd23ab56111bc056b9163'); // funciona em domínio público
define('GNEWS_KEY',    '');
define('NEWSDATA_KEY', '');

define('CACHE_FILE', __DIR__ . '/../cache/news_cache.json');
define('CACHE_TTL',  21600); // 6 horas

if (!is_dir(__DIR__ . '/../cache')) {
    mkdir(__DIR__ . '/../cache', 0755, true);
}

// ── Cache ────────────────────────────────────────────────────
if (file_exists(CACHE_FILE)) {
    $cache = json_decode(file_get_contents(CACHE_FILE), true);
    if ($cache && isset($cache['ts']) && (time() - $cache['ts']) < CACHE_TTL) {
        echo json_encode(['success' => true, 'articles' => $cache['articles'], 'cached' => true, 'source' => $cache['source'] ?? 'cache']);
        exit;
    }
}

// ── Helper HTTP ───────────────────────────────────────────────
function httpGet($url, $timeout = 10) {
    $ctx = stream_context_create(['http' => [
        'timeout' => $timeout,
        'header'  => "User-Agent: VeriFact/1.0\r\nAccept: application/json\r\n",
        'ignore_errors' => true,
    ]]);
    $res = @file_get_contents($url, false, $ctx);
    return $res ? json_decode($res, true) : null;
}

// ── Normalizar para formato comum ────────────────────────────
function makeArticle($title, $description, $url, $source, $image, $publishedAt) {
    return [
        'title'       => $title,
        'description' => $description,
        'url'         => $url,
        'source'      => ['name' => $source],
        'urlToImage'  => $image,
        'publishedAt' => $publishedAt,
    ];
}

function filterArticles($articles) {
    return array_values(array_filter($articles, function($a) {
        return !empty($a['title'])
            && $a['title'] !== '[Removed]'
            && strlen($a['title']) > 10
            && !empty($a['url']);
    }));
}

$articles = [];
$source   = '';

// ══════════════════════════════════════════════════════════════
// FONTE 1 — NewsAPI (funciona em domínio público)
// ══════════════════════════════════════════════════════════════
if (empty($articles) && !empty(NEWSAPI_KEY)) {
    $queries = [
        'https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=' . NEWSAPI_KEY,
        'https://newsapi.org/v2/everything?q=Portugal&language=pt&sortBy=publishedAt&pageSize=20&apiKey=' . NEWSAPI_KEY,
        'https://newsapi.org/v2/everything?q=fake+news+OR+misinformation&language=en&sortBy=publishedAt&pageSize=15&apiKey=' . NEWSAPI_KEY,
    ];
    foreach ($queries as $url) {
        $data = httpGet($url);
        if ($data && isset($data['articles'])) {
            foreach ($data['articles'] as $a) {
                if (($a['title']??'') === '[Removed]') continue;
                $articles[] = makeArticle($a['title']??'', $a['description']??'', $a['url']??'#', $a['source']['name']??'NewsAPI', $a['urlToImage']??null, $a['publishedAt']??date('c'));
            }
        }
    }
    if (!empty($articles)) $source = 'newsapi';
}

// ══════════════════════════════════════════════════════════════
// FONTE 2 — GNews API (100/dia grátis, funciona em localhost)
// Registar em: https://gnews.io/register
// ══════════════════════════════════════════════════════════════
if (empty($articles) && !empty(GNEWS_KEY)) {
    $data = httpGet('https://gnews.io/api/v4/top-headlines?lang=pt&country=pt&max=20&apikey=' . GNEWS_KEY);
    if ($data && isset($data['articles']) && count($data['articles']) > 0) {
        foreach ($data['articles'] as $a) {
            $articles[] = makeArticle(
                $a['title']       ?? '',
                $a['description'] ?? '',
                $a['url']         ?? '#',
                $a['source']['name'] ?? 'GNews',
                $a['image']       ?? null,
                $a['publishedAt'] ?? date('c')
            );
        }
        // Buscar também em inglês
        $data2 = httpGet('https://gnews.io/api/v4/top-headlines?lang=en&max=20&apikey=' . GNEWS_KEY);
        if ($data2 && isset($data2['articles'])) {
            foreach ($data2['articles'] as $a) {
                $articles[] = makeArticle($a['title']??'', $a['description']??'', $a['url']??'#', $a['source']['name']??'GNews', $a['image']??null, $a['publishedAt']??date('c'));
            }
        }
        $source = 'gnews';
    }
}

// ══════════════════════════════════════════════════════════════
// FONTE 3 — NewsData.io (200/dia grátis, funciona em localhost)
// Registar em: https://newsdata.io/register
// ══════════════════════════════════════════════════════════════
if (empty($articles) && !empty(NEWSDATA_KEY)) {
    $data = httpGet('https://newsdata.io/api/1/news?apikey=' . NEWSDATA_KEY . '&country=pt&language=pt&size=20');
    if ($data && isset($data['results']) && count($data['results']) > 0) {
        foreach ($data['results'] as $a) {
            $articles[] = makeArticle(
                $a['title']       ?? '',
                $a['description'] ?? '',
                $a['link']        ?? '#',
                is_array($a['source_id'] ?? null) ? implode(', ', $a['source_id']) : ($a['source_id'] ?? 'NewsData'),
                $a['image_url']   ?? null,
                $a['pubDate']     ?? date('c')
            );
        }
        $source = 'newsdata';
    }
}

// ══════════════════════════════════════════════════════════════
// FONTE 4 — RSS Feeds públicos (SEM chave, funciona SEMPRE)
// ══════════════════════════════════════════════════════════════
if (empty($articles)) {
    $feeds = [
        ['url' => 'https://feeds.bbci.co.uk/news/world/rss.xml',         'source' => 'BBC News'],
        ['url' => 'https://rss.publico.pt/mundo.rss',                     'source' => 'Público'],
        ['url' => 'https://observador.pt/feed/',                          'source' => 'Observador'],
        ['url' => 'https://rss.cnn.com/rss/edition.rss',                 'source' => 'CNN'],
        ['url' => 'https://feeds.reuters.com/Reuters/worldNews',          'source' => 'Reuters'],
    ];

    foreach ($feeds as $feed) {
        $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: VeriFact/1.0\r\n"]]);
        $xml = @file_get_contents($feed['url'], false, $ctx);
        if (!$xml) continue;

        $xml = @simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        if (!$xml) continue;

        $items = $xml->channel->item ?? $xml->entry ?? [];
        $count = 0;
        foreach ($items as $item) {
            if ($count >= 8) break;
            $title = (string)($item->title ?? '');
            $desc  = strip_tags((string)($item->description ?? $item->summary ?? ''));
            $link  = (string)($item->link ?? $item->id ?? '#');
            $date  = (string)($item->pubDate ?? $item->updated ?? date('c'));
            $img   = null;

            // Tentar extrair imagem do media:content ou enclosure
            $ns = $item->children('media', true);
            if (isset($ns->content)) {
                $img = (string)$ns->content->attributes()['url'];
            }
            if (!$img && isset($item->enclosure)) {
                $img = (string)$item->enclosure->attributes()['url'];
            }

            if (strlen($title) < 10) continue;

            $articles[] = makeArticle($title, $desc, $link, $feed['source'], $img, date('c', strtotime($date)));
            $count++;
        }
        if (count($articles) >= 30) break;
    }
    $source = 'rss';
}

// ══════════════════════════════════════════════════════════════
// FALLBACK FINAL — Notícias estáticas (nunca falha)
// ══════════════════════════════════════════════════════════════
if (empty($articles)) {
    $articles = [
        makeArticle('Governo anuncia medidas contra desinformação nas redes sociais', 'O executivo propõe novas medidas para regular plataformas digitais e combater fake news em Portugal.', '#', 'Público', null, date('c')),
        makeArticle('Estudo viral sobre vitaminas é desmentido por especialistas', 'Investigadores contestam publicações que circulam amplamente nas redes sociais.', '#', 'Jornal de Notícias', null, date('c')),
        makeArticle('Deepfake de figura política gera polémica online', 'Vídeo manipulado com IA circula amplamente antes de ser detetado pelas plataformas.', '#', 'Observador', null, date('c')),
        makeArticle('Nova regulação europeia obriga plataformas a combater fake news', 'Legislação entra em vigor e exige transparência total nos algoritmos.', '#', 'Euronews', null, date('c')),
        makeArticle('Portugal sobe no ranking mundial de literacia mediática', 'País melhora posição em índice internacional de combate à desinformação.', '#', 'RTP', null, date('c')),
        makeArticle('Banco de Portugal alerta para esquema de phishing sofisticado', 'Mensagens falsas imitam comunicações oficiais bancárias geradas por IA.', '#', 'BdP', null, date('c')),
        makeArticle('Cientistas descobrem novo método de deteção de imagens falsas', 'Nova tecnologia consegue identificar deepfakes com 98% de precisão.', '#', 'Science Daily', null, date('c')),
        makeArticle('Redes sociais sob pressão para rotular conteúdo gerado por IA', 'Reguladores europeus exigem transparência sobre uso de inteligência artificial.', '#', 'TechCrunch', null, date('c')),
    ];
    $source = 'fallback';
}

// ── Filtrar e ordenar ────────────────────────────────────────
$articles = filterArticles($articles);
usort($articles, fn($a, $b) => strtotime($b['publishedAt']) - strtotime($a['publishedAt']));
$articles = array_slice($articles, 0, 40);

// ── Cache ────────────────────────────────────────────────────
file_put_contents(CACHE_FILE, json_encode(['ts' => time(), 'articles' => $articles, 'source' => $source]));

echo json_encode(['success' => true, 'articles' => $articles, 'source' => $source, 'total' => count($articles)]);
