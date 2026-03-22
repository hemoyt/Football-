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

$playerId = isset($_GET['player_id']) ? (int)$_GET['player_id'] : 0;
if ($playerId <= 0) {
    jsonError('A valid player_id is required.', 400);
}

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
        "SELECT status FROM contact_requests
         WHERE club_profile_id = ? AND player_profile_id = ?
         LIMIT 1"
    );
    $stmt->execute([$club['id'], $playerId]);
    $request = $stmt->fetch();

    jsonSuccess(['status' => $request ? $request['status'] : null]);

} catch (PDOException $e) {
    error_log('request-status DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
