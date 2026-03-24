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

$session = requireSessionMulti(['player', 'club', 'admin']);

$targetId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

try {
    $db = getDB();

    if ($targetId > 0) {
        // Specific player — clubs, admins, or the player themselves can access
        $stmt = $db->prepare(
            "SELECT ps.*
             FROM player_skills ps
             JOIN player_profiles pp ON pp.id = ps.player_id
             JOIN users u ON u.id = pp.user_id
             WHERE ps.player_id = ?
               AND u.is_deleted = 0
             LIMIT 1"
        );
        $stmt->execute([$targetId]);
    } else {
        // Own skills — must be a player
        if ($session['role'] !== 'player') {
            jsonError('A player id is required.', 400);
        }

        $stmt = $db->prepare(
            "SELECT ps.*
             FROM player_skills ps
             JOIN player_profiles pp ON pp.id = ps.player_id
             WHERE pp.user_id = ?
             LIMIT 1"
        );
        $stmt->execute([$session['user_id']]);
    }

    $skills = $stmt->fetch();

    if (!$skills) {
        jsonError('Skills record not found.', 404);
    }

    jsonSuccess($skills);

} catch (PDOException $e) {
    error_log('skills DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
