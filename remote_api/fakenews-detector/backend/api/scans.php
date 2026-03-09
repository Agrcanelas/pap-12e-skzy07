<?php
// ============================================================
//  VeriFact — API de Verificações (Scans)
//  Ficheiro: backend/api/scans.php
//
//  POST /api/scans.php?action=save     → Guardar resultado
//  GET  /api/scans.php?action=history  → Histórico do utilizador
//  GET  /api/scans.php?action=get&id=X → Detalhes de um scan
//  DELETE /api/scans.php?action=delete&id=X → Apagar
// ============================================================

require_once __DIR__ . '/../config/helpers.php';
setCORSHeaders();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ---- SAVE SCAN ----
if ($method === 'POST' && $action === 'save') {
    $user = getAuthUser(); // pode ser null (utilizador anónimo)
    $body = getJsonBody();

    $inputType    = $body['input_type']    ?? 'text';
    $inputContent = $body['input_content'] ?? '';
    $verdict      = $body['verdict']       ?? 'suspicious';
    $reliability  = (int)($body['reliability']  ?? 50);
    $confidence   = (int)($body['confidence']   ?? 50);
    $fakeScore    = (int)($body['fake_score']   ?? 50);
    $summary      = $body['summary']       ?? null;
    $indicators   = $body['indicators']    ?? null;
    $sources      = $body['sources']       ?? null;
    $realNews     = $body['real_news']     ?? null;
    $aiRaw        = $body['ai_raw']        ?? null;

    if (!$inputContent) jsonError('Conteúdo da verificação em falta.');
    if (!in_array($verdict, ['fake','suspicious','real'])) jsonError('Veredicto inválido.');

    // Truncar para a DB
    if (strlen($inputContent) > 65535) $inputContent = substr($inputContent, 0, 65535);

    $db = DB::get();
    $stmt = $db->prepare('
        INSERT INTO scans
          (user_id, input_type, input_content, verdict, reliability, confidence, fake_score,
           summary, indicators, sources, real_news, ai_raw)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ');
    $stmt->execute([
        $user ? $user['user_id'] : null,
        $inputType,
        $inputContent,
        $verdict,
        $reliability,
        $confidence,
        $fakeScore,
        $summary,
        $indicators ? json_encode($indicators, JSON_UNESCAPED_UNICODE) : null,
        $sources    ? json_encode($sources,    JSON_UNESCAPED_UNICODE) : null,
        $realNews   ? json_encode($realNews,   JSON_UNESCAPED_UNICODE) : null,
        $aiRaw      ? json_encode($aiRaw,      JSON_UNESCAPED_UNICODE) : null,
    ]);
    $scanId = (int) $db->lastInsertId();

    jsonSuccess(['scan_id' => $scanId], 201);
}

// ---- HISTORY ----
if ($method === 'GET' && $action === 'history') {
    $user = requireAuth();

    $limit  = min((int)($_GET['limit']  ?? 20), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    $db = DB::get();
    $stmt = $db->prepare('
        SELECT s.id, s.input_type, LEFT(s.input_content, 120) AS preview,
               s.verdict, s.reliability, s.confidence, s.created_at,
               r.id AS report_id, r.filename AS report_file
        FROM scans s
        LEFT JOIN reports r ON r.scan_id = s.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
    ');
    $stmt->execute([$user['user_id'], $limit, $offset]);
    $scans = $stmt->fetchAll();

    // Total count
    $countStmt = $db->prepare('SELECT COUNT(*) FROM scans WHERE user_id = ?');
    $countStmt->execute([$user['user_id']]);
    $total = (int) $countStmt->fetchColumn();

    jsonSuccess(['scans' => $scans, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

// ---- GET ONE ----
if ($method === 'GET' && $action === 'get') {
    $user   = requireAuth();
    $scanId = (int)($_GET['id'] ?? 0);
    if (!$scanId) jsonError('ID inválido.');

    $db   = DB::get();
    $stmt = $db->prepare('SELECT * FROM scans WHERE id = ? AND user_id = ?');
    $stmt->execute([$scanId, $user['user_id']]);
    $scan = $stmt->fetch();

    if (!$scan) jsonError('Verificação não encontrada.', 404);

    // Parse JSON fields
    foreach (['indicators','sources','real_news','ai_raw'] as $f) {
        if ($scan[$f]) $scan[$f] = json_decode($scan[$f], true);
    }

    jsonSuccess($scan);
}

// ---- DELETE ----
if ($method === 'DELETE' && $action === 'delete') {
    $user   = requireAuth();
    $scanId = (int)($_GET['id'] ?? 0);
    if (!$scanId) jsonError('ID inválido.');

    $db   = DB::get();
    // Só pode apagar os seus próprios (a menos que admin)
    $where = $user['role'] === 'admin' ? 'id = ?' : 'id = ? AND user_id = ' . $user['user_id'];
    $stmt = $db->prepare("DELETE FROM scans WHERE $where");
    $stmt->execute([$scanId]);

    if ($stmt->rowCount() === 0) jsonError('Verificação não encontrada ou sem permissão.', 404);
    jsonSuccess(['deleted' => true]);
}

// ---- STATS (dashboard rápido) ----
if ($method === 'GET' && $action === 'stats') {
    $user = requireAuth();
    $db   = DB::get();

    $stmt = $db->prepare('
        SELECT
          COUNT(*) AS total,
          SUM(verdict = "fake") AS fake_count,
          SUM(verdict = "real") AS real_count,
          SUM(verdict = "suspicious") AS suspicious_count,
          AVG(reliability) AS avg_reliability
        FROM scans WHERE user_id = ?
    ');
    $stmt->execute([$user['user_id']]);
    $stats = $stmt->fetch();
    jsonSuccess($stats);
}

jsonError('Ação inválida.', 404);
