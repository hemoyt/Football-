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
    $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 25)));
    $offset  = ($page - 1) * $perPage;

    $search = isset($_GET['search']) ? trim((string)$_GET['search']) : '';

    $conditions = ["u.role = 'player'", "u.is_deleted = 0"];
    $countParams = [];
    $pageParams  = [];

    if ($search !== '') {
        $conditions[]  = '(pp.full_name LIKE ? OR u.email LIKE ?)';
        $like          = '%' . $search . '%';
        $countParams[] = $like;
        $countParams[] = $like;
    }

    $whereClause = implode(' AND ', $conditions);

    $countStmt = $db->prepare(
        "SELECT COUNT(*) FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE {$whereClause}"
    );
    $countStmt->execute($countParams);
    $total = (int)$countStmt->fetchColumn();
    $pages = (int)ceil($total / $perPage);

    $pageParams = array_merge($countParams, [$perPage, $offset]);

    $stmt = $db->prepare(
        "SELECT pp.id AS player_id, pp.user_id, pp.full_name, pp.date_of_birth,
                pp.position_primary, pp.nationality, pp.photo_url, pp.profile_views,
                pp.created_at,
                u.email, u.is_active, u.last_login
         FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE {$whereClause}
         ORDER BY pp.created_at DESC
         LIMIT ? OFFSET ?"
    );
    $stmt->execute($pageParams);

    jsonSuccess([
        'players' => $stmt->fetchAll(),
        'total'   => $total,
        'pages'   => max(1, $pages),
        'page'    => $page,
    ]);

} catch (PDOException $e) {
    error_log('admin/players DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
