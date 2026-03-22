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

$session = requireSession('player');

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

$requestId = isset($body['request_id']) ? (int)$body['request_id'] : 0;
$status    = isset($body['status'])     ? trim((string)$body['status']) : '';

if ($requestId <= 0) {
    jsonError('A valid request_id is required.');
}

$allowedStatuses = ['accepted', 'declined'];
if (!in_array($status, $allowedStatuses, true)) {
    jsonError("status must be one of: accepted, declined.");
}

try {
    $db = getDB();

    // Get the player's own profile id
    $profStmt = $db->prepare("SELECT id FROM player_profiles WHERE user_id = ? LIMIT 1");
    $profStmt->execute([$session['user_id']]);
    $profile = $profStmt->fetch();

    if (!$profile) {
        jsonError('Player profile not found.', 404);
    }

    // Verify that this request belongs to this player
    $checkStmt = $db->prepare(
        "SELECT id, status FROM contact_requests
         WHERE id = ? AND player_profile_id = ?
         LIMIT 1"
    );
    $checkStmt->execute([$requestId, $profile['id']]);
    $request = $checkStmt->fetch();

    if (!$request) {
        jsonError('Contact request not found or access denied.', 404);
    }

    if ($request['status'] !== 'pending') {
        jsonError('This request has already been responded to.');
    }

    $updStmt = $db->prepare(
        "UPDATE contact_requests
         SET status = ?, responded_at = NOW()
         WHERE id = ?"
    );
    $updStmt->execute([$status, $requestId]);

    jsonSuccess(['success' => true, 'status' => $status]);

} catch (PDOException $e) {
    error_log('respond-request DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
