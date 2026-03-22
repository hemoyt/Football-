<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
requireSession('admin');
$db   = getDB();
$stmt = $db->prepare("
    SELECT cp.id, cp.club_name, cp.country, cp.league_division,
           cp.contact_person_name, cp.contact_title, cp.phone,
           cp.doc_url, cp.created_at,
           u.email
    FROM club_profiles cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.verification_status = 'pending' AND cp.is_deleted = 0
    ORDER BY cp.created_at ASC
");
$stmt->execute();
jsonSuccess($stmt->fetchAll());
