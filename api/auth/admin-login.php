<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../api/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed.', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!is_array($body)) {
    jsonError('Invalid JSON body.');
}

if (!isset($body['email'], $body['password'], $body['secret'])) {
    jsonError('email, password, and secret are required.');
}

$email    = trim((string)$body['email']);
$password = (string)$body['password'];
$secret   = (string)$body['secret'];

if ($email === '' || $password === '' || $secret === '') {
    jsonError('email, password, and secret must not be empty.');
}

// Validate the admin secret using hash_equals to prevent timing attacks
if (!hash_equals(ADMIN_SECRET, $secret)) {
    // Generic error to avoid leaking secret existence
    jsonError('Invalid credentials.', 401);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email address.');
}

try {
    $db = getDB();

    $stmt = $db->prepare(
        "SELECT id, email, password_hash, role, is_active, is_deleted
         FROM users
         WHERE email = ? AND role = 'admin'
         LIMIT 1"
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('Invalid credentials.', 401);
    }

    if ((int)$user['is_deleted'] === 1) {
        jsonError('This account has been removed.', 403);
    }

    if ((int)$user['is_active'] !== 1) {
        jsonError('This account is suspended.', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        jsonError('Invalid credentials.', 401);
    }

    // Regenerate session ID to prevent session fixation
    session_regenerate_id(true);

    $_SESSION['user_id'] = (int)$user['id'];
    $_SESSION['role']    = 'admin';
    $_SESSION['email']   = $user['email'];

    // Update last login timestamp
    $upd = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $upd->execute([$user['id']]);

    jsonSuccess([
        'success' => true,
        'data' => [
            'id'    => (int)$user['id'],
            'email' => $user['email'],
            'role'  => 'admin',
        ],
    ]);

} catch (PDOException $e) {
    error_log('Admin login DB error: ' . $e->getMessage());
    jsonError('A server error occurred. Please try again later.', 500);
}
