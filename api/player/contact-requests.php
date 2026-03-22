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

    // Get the player's own profile id
    $profStmt = $db->prepare("SELECT id FROM player_profiles WHERE user_id = ? LIMIT 1");
    $profStmt->execute([$session['user_id']]);
    $profile = $profStmt->fetch();

    if (!$profile) {
        jsonError('Player profile not found.', 404);
    }

    $stmt = $db->prepare(
        "SELECT cr.id, cr.status, cr.message, cr.sent_at, cr.responded_at,
                cp.id AS club_profile_id, cp.club_name, cp.country, cp.city, cp.logo_url,
                u.email AS club_email
         FROM contact_requests cr
         JOIN club_profiles cp ON cp.id = cr.club_profile_id
         JOIN users u ON u.id = cp.user_id
         WHERE cr.player_profile_id = ?
         ORDER BY cr.sent_at DESC"
    );
    $stmt->execute([$profile['id']]);

    jsonSuccess($stmt->fetchAll());

} catch (PDOException $e) {
    error_log('player contact-requests DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
