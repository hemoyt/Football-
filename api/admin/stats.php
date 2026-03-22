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

requireSession('admin');

try {
    $db = getDB();

    $totalPlayers = (int)$db->query(
        "SELECT COUNT(*) FROM player_profiles pp
         JOIN users u ON u.id = pp.user_id
         WHERE u.is_deleted = 0"
    )->fetchColumn();

    $pendingClubs = (int)$db->query(
        "SELECT COUNT(*) FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.verification_status = 'pending' AND u.is_deleted = 0"
    )->fetchColumn();

    $verifiedClubs = (int)$db->query(
        "SELECT COUNT(*) FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.verification_status = 'verified' AND u.is_deleted = 0"
    )->fetchColumn();

    $rejectedClubs = (int)$db->query(
        "SELECT COUNT(*) FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.verification_status IN ('rejected', 'revoked') AND u.is_deleted = 0"
    )->fetchColumn();

    $totalRequests = (int)$db->query(
        "SELECT COUNT(*) FROM contact_requests"
    )->fetchColumn();

    jsonSuccess([
        'total_players'  => $totalPlayers,
        'pending_clubs'  => $pendingClubs,
        'verified_clubs' => $verifiedClubs,
        'rejected_clubs' => $rejectedClubs,
        'total_requests' => $totalRequests,
    ]);

} catch (PDOException $e) {
    error_log('admin/stats DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
