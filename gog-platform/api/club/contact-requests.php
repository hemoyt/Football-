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

$session = requireSession('club');

try {
    $db = getDB();

    $clubStmt = $db->prepare(
        "SELECT id FROM club_profiles WHERE user_id = ? LIMIT 1"
    );
    $clubStmt->execute([$session['user_id']]);
    $club = $clubStmt->fetch();

    if (!$club) {
        jsonError('Club profile not found.', 404);
    }

    $stmt = $db->prepare(
        "SELECT cr.id, cr.status, cr.message, cr.sent_at, cr.responded_at,
                pp.id AS player_id, pp.full_name AS player_name,
                pp.position_primary, pp.photo_url, pp.nationality,
                u.email AS player_email
         FROM contact_requests cr
         JOIN player_profiles pp ON pp.id = cr.player_id
         JOIN users u ON u.id = pp.user_id
         WHERE cr.club_id = ?
         ORDER BY cr.sent_at DESC"
    );
    $stmt->execute([$club['id']]);

    jsonSuccess($stmt->fetchAll());

} catch (PDOException $e) {
    error_log('club contact-requests DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
