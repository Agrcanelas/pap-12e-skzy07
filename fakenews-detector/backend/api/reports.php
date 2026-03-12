<?php
// ============================================================
//  VeriFact — API de Relatórios PDF
//  Ficheiro: backend/api/reports.php
//
//  POST   /api/reports.php?action=save    → Registar PDF gerado
//  GET    /api/reports.php?action=list    → Listar relatórios
//  GET    /api/reports.php?action=count&id=X → Incrementar download
//  DELETE /api/reports.php?action=delete&id=X → Apagar registo
// ============================================================

require_once __DIR__ . '/../config/helpers.php';
setCORSHeaders();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ---- SAVE REPORT RECORD ----
if ($method === 'POST' && $action === 'save') {
    $user = getAuthUser();
    $body = getJsonBody();

    $scanId   = (int)($body['scan_id']      ?? 0);
    $filename = trim($body['filename']       ?? '');
    $fileSize = (int)($body['file_size_kb']  ?? 0);

    if (!$scanId)   jsonError('scan_id em falta.');
    if (!$filename) jsonError('filename em falta.');

    $db = DB::get();

    // Verify scan exists (and belongs to user if not admin)
    $scanStmt = $db->prepare('SELECT id, user_id FROM scans WHERE id = ?');
    $scanStmt->execute([$scanId]);
    $scan = $scanStmt->fetch();

    if (!$scan) jsonError('Verificação não encontrada.', 404);

    $stmt = $db->prepare('
        INSERT INTO reports (scan_id, user_id, filename, file_size_kb)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([
        $scanId,
        $user ? $user['user_id'] : null,
        $filename,
        $fileSize
    ]);
    $reportId = (int) $db->lastInsertId();

    jsonSuccess(['report_id' => $reportId], 201);
}

// ---- LIST REPORTS ----
if ($method === 'GET' && $action === 'list') {
    $user = requireAuth();

    $limit  = min((int)($_GET['limit']  ?? 20), 100);
    $offset = (int)($_GET['offset'] ?? 0);

    $db = DB::get();
    $stmt = $db->prepare('
        SELECT r.id, r.scan_id, r.filename, r.file_size_kb,
               r.download_count, r.generated_at,
               s.verdict, LEFT(s.input_content, 100) AS scan_preview,
               s.reliability
        FROM reports r
        JOIN scans s ON s.id = r.scan_id
        WHERE r.user_id = ?
        ORDER BY r.generated_at DESC
        LIMIT ? OFFSET ?
    ');
    $stmt->execute([$user['user_id'], $limit, $offset]);
    $reports = $stmt->fetchAll();

    $countStmt = $db->prepare('SELECT COUNT(*) FROM reports WHERE user_id = ?');
    $countStmt->execute([$user['user_id']]);
    $total = (int) $countStmt->fetchColumn();

    jsonSuccess(['reports' => $reports, 'total' => $total]);
}

// ---- INCREMENT DOWNLOAD COUNT ----
if ($method === 'POST' && $action === 'count') {
    $reportId = (int)($_GET['id'] ?? 0);
    if (!$reportId) jsonError('ID inválido.');

    $db = DB::get();
    $db->prepare('UPDATE reports SET download_count = download_count + 1 WHERE id = ?')
       ->execute([$reportId]);

    jsonSuccess(['incremented' => true]);
}

// ---- DELETE REPORT RECORD ----
if ($method === 'DELETE' && $action === 'delete') {
    $user     = requireAuth();
    $reportId = (int)($_GET['id'] ?? 0);
    if (!$reportId) jsonError('ID inválido.');

    $db   = DB::get();
    $stmt = $db->prepare('DELETE FROM reports WHERE id = ? AND user_id = ?');
    $stmt->execute([$reportId, $user['user_id']]);

    if ($stmt->rowCount() === 0) jsonError('Relatório não encontrado ou sem permissão.', 404);
    jsonSuccess(['deleted' => true]);
}

// ---- STATS ----
if ($method === 'GET' && $action === 'stats') {
    $user = requireAuth();
    $db   = DB::get();

    $stmt = $db->prepare('
        SELECT COUNT(*) AS total_reports,
               SUM(download_count) AS total_downloads,
               SUM(file_size_kb) AS total_size_kb
        FROM reports WHERE user_id = ?
    ');
    $stmt->execute([$user['user_id']]);
    jsonSuccess($stmt->fetch());
}

jsonError('Ação inválida.', 404);
