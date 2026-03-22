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

    $stmt = $db->prepare(
        "SELECT cp.id, cp.club_name, cp.country, cp.league_division,
                cp.contact_person_name, cp.contact_title, cp.phone, cp.doc_url,
                cp.verification_status, cp.created_at,
                u.id AS user_id, u.email, u.is_active
         FROM club_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.verification_status = 'pending'
           AND u.is_deleted = 0
         ORDER BY cp.created_at ASC"
    );
    $stmt->execute();

    jsonSuccess($stmt->fetchAll());

} catch (PDOException $e) {
    error_log('admin/pending-clubs DB error: ' . $e->getMessage());
    jsonError('A server error occurred.', 500);
}
