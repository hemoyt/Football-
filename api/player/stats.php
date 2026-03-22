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

$session = requireSession('player');

try {
    $db = getDB();

    // Get player profile
    $profStmt = $db->prepare(
        "SELECT id, profile_views FROM player_profiles WHERE user_id = ? LIMIT 1"
    );
    $profStmt->execute([$session['user_id']]);
    $profile = $profStmt->fetch();

    if (!$profile) {
        jsonError('Player profile not found.', 404);
    }

    $profileId = (int)$profile['id'];

    // Count total contact requests
    $totalStmt = $db->prepare(
        "SELECT COUNT(*) AS total FROM contact_requests WHERE player_profile_id = ?"
    );
    $totalStmt->execute([$profileId]);
    $totalRow = $totalStmt->fetch();

    // Count accepted contact requests
    $acceptedStmt = $db->prepare(
        "SELECT COUNT(*) AS total FROM contact_requests
         WHERE player_profile_id = ? AND status = 'accepted'"
    );
    $acceptedStmt->execute([$profileId]);
    $acceptedRow = $acceptedStmt->fetch();

    jsonSuccess([
        'profile_views'     => (int)$profile['profile_views'],
        'total_requests'    => (int)$totalRow['total'],
        'accepted_requests' => (int)$acceptedRow['total'],
    ]);

} catch (PDOException $e) {
    error_log('player stats DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
