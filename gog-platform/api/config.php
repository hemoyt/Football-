<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'gog_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');
define('UPLOAD_BASE', dirname(__DIR__) . '/uploads/');
define('UPLOAD_URL_BASE', '/uploads/');
define('MAX_PHOTO_SIZE', 5 * 1024 * 1024);   // 5MB
define('MAX_DOC_SIZE',  10 * 1024 * 1024);   // 10MB
define('MAX_VIDEO_SIZE', 500 * 1024 * 1024); // 500MB
define('ALLOWED_PHOTO_TYPES', ['image/jpeg','image/png','image/webp','image/gif']);
define('ALLOWED_DOC_TYPES',   ['application/pdf','image/jpeg','image/png','image/webp']);
define('ALLOWED_VIDEO_TYPES', ['video/mp4','video/webm','video/ogg','video/avi','video/mov','video/quicktime','video/x-m4v','video/x-msvideo','video/x-matroska']);
define('ADMIN_SECRET', 'GOG_ADMIN_2024');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

function jsonSuccess($data = null, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data ?? ['success' => true]);
    exit;
}

function jsonError(string $message, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['message' => $message]);
    exit;
}

function requireSession(string $role = ''): array {
    if (empty($_SESSION['user_id'])) jsonError('Authentication required.', 401);
    if ($role && $_SESSION['role'] !== $role) jsonError('Insufficient permissions.', 403);
    return $_SESSION;
}

function requireSessionMulti(array $roles): array {
    if (empty($_SESSION['user_id'])) jsonError('Authentication required.', 401);
    if (!in_array($_SESSION['role'], $roles, true)) jsonError('Insufficient permissions.', 403);
    return $_SESSION;
}

function logAction(PDO $db, ?int $actorId, string $action, ?string $targetType = null, ?int $targetId = null, ?array $meta = null): void {
    $stmt = $db->prepare("INSERT INTO system_logs (actor_id, action, target_type, target_id, meta) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$actorId, $action, $targetType, $targetId, $meta ? json_encode($meta) : null]);
}

function sanitizeFilename(string $name): string {
    return preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($name));
}
