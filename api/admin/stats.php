<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
require_once __DIR__ . '/../../api/config.php';
requireSession('admin');
$db = getDB();
$stats = [
    'total_players'  => (int)$db->query("SELECT COUNT(*) FROM player_profiles WHERE is_deleted=0")->fetchColumn(),
    'pending_clubs'  => (int)$db->query("SELECT COUNT(*) FROM club_profiles WHERE verification_status='pending' AND is_deleted=0")->fetchColumn(),
    'verified_clubs' => (int)$db->query("SELECT COUNT(*) FROM club_profiles WHERE verification_status='verified' AND is_deleted=0")->fetchColumn(),
    'rejected_clubs' => (int)$db->query("SELECT COUNT(*) FROM club_profiles WHERE verification_status='rejected' AND is_deleted=0")->fetchColumn(),
    'total_requests' => (int)$db->query("SELECT COUNT(*) FROM contact_requests")->fetchColumn(),
];
jsonSuccess($stats);
