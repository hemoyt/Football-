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

// Clubs only
$session = requireSession('club');

$playerId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($playerId <= 0) {
    jsonError('A valid player id is required.', 400);
}

try {
    $db = getDB();

    // Fetch the player profile — exclude soft-deleted accounts
    $stmt = $db->prepare(
        "SELECT pp.id, pp.user_id, pp.full_name, pp.date_of_birth, pp.position_primary,
                pp.position_secondary, pp.preferred_foot, pp.nationality, pp.height_cm,
                pp.weight_kg, pp.bio, pp.instagram_url, pp.youtube_url, pp.photo_url,
                pp.profile_views, pp.created_at, u.email
         FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE pp.id = ?
           AND u.is_deleted = 0
           AND u.is_active = 1
         LIMIT 1"
    );
    $stmt->execute([$playerId]);
    $player = $stmt->fetch();

    if (!$player) {
        jsonError('Player not found.', 404);
    }

    // Log this view
    $logStmt = $db->prepare(
        "INSERT INTO profile_views_log (player_id, viewed_by, viewed_at)
         VALUES (?, ?, NOW())"
    );
    $logStmt->execute([$playerId, $session['user_id']]);

    // Increment view counter
    $updStmt = $db->prepare(
        "UPDATE player_profiles SET profile_views = profile_views + 1 WHERE id = ?"
    );
    $updStmt->execute([$playerId]);

    $player['profile_views'] = (int)$player['profile_views'] + 1;

    jsonSuccess($player);

} catch (PDOException $e) {
    error_log('public-profile DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
