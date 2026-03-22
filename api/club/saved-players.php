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
        "SELECT pp.id, pp.full_name, pp.date_of_birth, pp.position_primary,
                pp.position_secondary, pp.nationality, pp.photo_url,
                pp.height_cm, pp.preferred_foot,
                sp.saved_at
         FROM saved_players sp
         JOIN player_profiles pp ON pp.id = sp.player_id
         JOIN users u ON u.id = pp.user_id
         WHERE sp.club_id = ?
           AND u.is_deleted = 0
           AND u.is_active = 1
         ORDER BY sp.saved_at DESC"
    );
    $stmt->execute([$club['id']]);

    jsonSuccess($stmt->fetchAll());

} catch (PDOException $e) {
    error_log('saved-players DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
