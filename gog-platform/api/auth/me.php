<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../api/config.php';

$session = requireSession();

jsonSuccess([
    'success' => true,
    'data' => [
        'id'    => (int)$session['user_id'],
        'email' => $session['email'],
        'role'  => $session['role'],
    ],
]);
