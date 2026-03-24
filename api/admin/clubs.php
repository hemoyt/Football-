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
    $status = isset($_GET['status']) ? trim((string)$_GET['status']) : '';

    $conditions  = ["u.is_deleted = 0", "u.role = 'club'"];
    $countParams = [];

    if ($search !== '') {
        $conditions[]  = '(cp.club_name LIKE ? OR u.email LIKE ?)';
        $like          = '%' . $search . '%';
        $countParams[] = $like;
        $countParams[] = $like;
    }

    $allowedStatuses = ['pending', 'verified', 'rejected'];
    if ($status !== '' && in_array($status, $allowedStatuses, true)) {
        $conditions[]  = 'cp.verification_status = ?';
        $countParams[] = $status;
    }

    $whereClause = implode(' AND ', $conditions);

    $countStmt = $db->prepare(
        "SELECT COUNT(*) FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE {$whereClause}"
    );
    $countStmt->execute($countParams);
    $total = (int)$countStmt->fetchColumn();
    $pages = (int)ceil($total / $perPage);

    $pageParams = array_merge($countParams, [$perPage, $offset]);

    $stmt = $db->prepare(
        "SELECT cp.id, cp.user_id, cp.club_name, cp.country, cp.league_division,
                cp.contact_person_name, cp.verification_status, cp.verified_at,
                cp.rejection_reason, cp.created_at,
                u.email, u.is_active, u.last_login
         FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE {$whereClause}
         ORDER BY cp.created_at DESC
         LIMIT ? OFFSET ?"
    );
    $stmt->execute($pageParams);

    jsonSuccess([
        'clubs' => $stmt->fetchAll(),
        'total' => $total,
        'pages' => max(1, $pages),
        'page'  => $page,
    ]);

} catch (PDOException $e) {
    error_log('admin/clubs DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
