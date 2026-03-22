<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed.', 405);
}

requireSession('admin');

try {
    $db = getDB();

    $page    = max(1, (int)($_GET['page']     ?? 1));
    $perPage = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
    $offset  = ($page - 1) * $perPage;

    // Optional filter by action type
    $actionFilter = isset($_GET['action']) ? trim((string)$_GET['action']) : '';

    $conditions  = [];
    $countParams = [];

    if ($actionFilter !== '') {
        $conditions[]  = 'sl.action = ?';
        $countParams[] = $actionFilter;
    }

    $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $countStmt = $db->prepare("SELECT COUNT(*) FROM system_logs sl {$whereClause}");
    $countStmt->execute($countParams);
    $total = (int)$countStmt->fetchColumn();
    $pages = (int)ceil($total / $perPage);

    $pageParams = array_merge($countParams, [$perPage, $offset]);

    $stmt = $db->prepare(
        "SELECT sl.id, sl.actor_id, sl.action, sl.target_type, sl.target_id,
                sl.meta, sl.created_at,
                u.email AS actor_email
         FROM system_logs sl
         LEFT JOIN users u ON u.id = sl.actor_id
         {$whereClause}
         ORDER BY sl.created_at DESC
         LIMIT ? OFFSET ?"
    );
    $stmt->execute($pageParams);

    jsonSuccess([
        'logs'  => $stmt->fetchAll(),
        'total' => $total,
        'pages' => max(1, $pages),
        'page'  => $page,
    ]);

} catch (PDOException $e) {
    error_log('admin/logs DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
