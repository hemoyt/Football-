<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

$session = requireSession('club');

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

$playerId = isset($body['player_id']) ? (int)$body['player_id'] : 0;
if ($playerId <= 0) {
    jsonError('A valid player_id is required.');
}

try {
    $db = getDB();

    // Get club_profile id
    $clubStmt = $db->prepare("SELECT id FROM club_profiles WHERE user_id = ? LIMIT 1");
    $clubStmt->execute([$session['user_id']]);
    $club = $clubStmt->fetch();

    if (!$club) {
        jsonError('Club profile not found.', 404);
    }

    // Verify player exists and is not deleted
    $playerStmt = $db->prepare(
        "SELECT pp.id FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE pp.id = ? AND u.is_deleted = 0
         LIMIT 1"
    );
    $playerStmt->execute([$playerId]);
    if (!$playerStmt->fetch()) {
        jsonError('Player not found.', 404);
    }

    // INSERT IGNORE silently handles duplicate (unique constraint on club_id + player_id)
    $insStmt = $db->prepare(
        "INSERT IGNORE INTO saved_players (club_id, player_id, saved_at)
         VALUES (?, ?, NOW())"
    );
    $insStmt->execute([$club['id'], $playerId]);

    jsonSuccess(['success' => true]);

} catch (PDOException $e) {
    error_log('save-player DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
