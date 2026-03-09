<?php
// ============================================================
//  VeriFact — API de Notícias em Destaque
//  Ficheiro: backend/api/news.php
//
//  GET /api/news.php?action=list          → listar notícias ativas
//  POST/DELETE apenas para admins
// ============================================================

require_once __DIR__ . '/../config/helpers.php';
setCORSHeaders();

$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'];

// ---- LIST ----
if ($method === 'GET' && $action === 'list') {
    $limit  = min((int)($_GET['limit']  ?? 12), 50);
    $offset = (int)($_GET['offset'] ?? 0);

    $db = DB::get();
    $stmt = $db->prepare('
        SELECT id, title, source, snippet, url, verdict, reliability, category, published_at
        FROM trending_news
        WHERE is_active = 1
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
    ');
    $stmt->execute([$limit, $offset]);
    $news = $stmt->fetchAll();

    $countStmt = $db->query('SELECT COUNT(*) FROM trending_news WHERE is_active = 1');
    $total = (int) $countStmt->fetchColumn();

    jsonSuccess(['news' => $news, 'total' => $total]);
}

// ---- ADD (admin) ----
if ($method === 'POST' && $action === 'add') {
    $user = requireAuth();
    if ($user['role'] !== 'admin') jsonError('Sem permissão.', 403);

    $body = getJsonBody();
    $title       = trim($body['title']       ?? '');
    $source      = trim($body['source']      ?? '');
    $snippet     = trim($body['snippet']     ?? '');
    $url         = trim($body['url']         ?? '');
    $verdict     =      $body['verdict']     ?? 'real';
    $reliability = (int)($body['reliability'] ?? 50);
    $category    = trim($body['category']    ?? '');

    if (!$title) jsonError('Título obrigatório.');

    $db = DB::get();
    $stmt = $db->prepare('
        INSERT INTO trending_news (title, source, snippet, url, verdict, reliability, category)
        VALUES (?,?,?,?,?,?,?)
    ');
    $stmt->execute([$title, $source, $snippet, $url, $verdict, $reliability, $category]);
    jsonSuccess(['id' => (int) $db->lastInsertId()], 201);
}

// ---- DELETE (admin) ----
if ($method === 'DELETE' && $action === 'delete') {
    $user = requireAuth();
    if ($user['role'] !== 'admin') jsonError('Sem permissão.', 403);

    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonError('ID inválido.');

    $db = DB::get();
    $db->prepare('UPDATE trending_news SET is_active = 0 WHERE id = ?')->execute([$id]);
    jsonSuccess(['deleted' => true]);
}

jsonError('Ação inválida.', 404);
