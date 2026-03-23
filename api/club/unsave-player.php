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

    $delStmt = $db->prepare(
        "DELETE FROM saved_players WHERE club_id = ? AND player_id = ?"
    );
    $delStmt->execute([$club['id'], $playerId]);

    jsonSuccess(['success' => true]);

} catch (PDOException $e) {
    error_log('unsave-player DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
