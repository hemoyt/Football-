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

// Validate required text fields from $_POST (multipart/form-data)
$required = ['club_name', 'email', 'password', 'country', 'city'];
foreach ($required as $field) {
    if (!isset($_POST[$field]) || trim((string)$_POST[$field]) === '') {
        jsonError("Field '{$field}' is required.");
    }
}

$clubName    = trim((string)$_POST['club_name']);
$email       = trim((string)$_POST['email']);
$password    = (string)$_POST['password'];
$country     = trim((string)$_POST['country']);
$city        = trim((string)$_POST['city']);

// Optional text fields
$founded     = isset($_POST['founded'])     ? trim((string)$_POST['founded'])     : null;
$description = isset($_POST['description']) ? trim((string)$_POST['description']) : null;
$website     = isset($_POST['website'])     ? trim((string)$_POST['website'])     : null;
$phone       = isset($_POST['phone'])       ? trim((string)$_POST['phone'])       : null;

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email address.');
}

// Validate password length
if (strlen($password) < 8) {
    jsonError('Password must be at least 8 characters long.');
}

// Validate optional website URL
if ($website !== null && $website !== '' && !filter_var($website, FILTER_VALIDATE_URL)) {
    jsonError('Invalid website URL.');
}

// Validate founded year if provided
if ($founded !== null && $founded !== '') {
    if (!ctype_digit($founded) || (int)$founded < 1800 || (int)$founded > (int)date('Y')) {
        jsonError('Invalid founded year.');
    }
    $founded = (int)$founded;
} else {
    $founded = null;
}

// Handle document upload
$docUrl = null;
if (isset($_FILES['doc_file']) && $_FILES['doc_file']['error'] !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['doc_file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('File upload error. Code: ' . $file['error']);
    }

    // Validate file size
    if ($file['size'] > MAX_DOC_SIZE) {
        jsonError('Document file exceeds maximum allowed size of 10MB.');
    }

    // Validate MIME type using finfo (server-side, not trusting client)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if (!in_array($mimeType, ALLOWED_DOC_TYPES, true)) {
        jsonError('Invalid document type. Allowed: PDF, JPEG, PNG, WebP.');
    }

    // Ensure upload directory exists
    $uploadDir = UPLOAD_BASE . 'docs/';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
        jsonError('Server error: could not create upload directory.', 500);
    }

    // Build safe unique filename
    $ext          = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeExt      = strtolower(sanitizeFilename($ext));
    $uniqueName   = bin2hex(random_bytes(16)) . '.' . $safeExt;
    $destination  = $uploadDir . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        jsonError('Failed to save uploaded file.', 500);
    }

    $docUrl = UPLOAD_URL_BASE . 'docs/' . $uniqueName;
}

try {
    $db = getDB();

    // Check email uniqueness
    $checkStmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        // Clean up uploaded file if email already exists
        if ($docUrl && file_exists(UPLOAD_BASE . ltrim($docUrl, '/'))) {
            @unlink(UPLOAD_BASE . ltrim($docUrl, '/'));
        }
        jsonError('An account with this email address already exists.', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $db->beginTransaction();

    // Insert into users
    $userStmt = $db->prepare(
        "INSERT INTO users (email, password_hash, role, is_active, is_deleted, created_at)
         VALUES (?, ?, 'club', 1, 0, NOW())"
    );
    $userStmt->execute([$email, $passwordHash]);
    $userId = (int)$db->lastInsertId();

    // Insert into club_profiles
    $clubStmt = $db->prepare(
        "INSERT INTO club_profiles
         (user_id, club_name, country, city, founded, description, website, phone,
          doc_url, verification_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())"
    );
    $clubStmt->execute([
        $userId, $clubName, $country, $city, $founded, $description, $website, $phone, $docUrl
    ]);

    $db->commit();

    // Set session
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['role']    = 'club';
    $_SESSION['email']   = $email;

    jsonSuccess([
        'success'             => true,
        'verification_status' => 'pending',
    ], 201);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    // Clean up uploaded file on DB failure
    if ($docUrl) {
        $localPath = UPLOAD_BASE . ltrim(str_replace(UPLOAD_URL_BASE, '', $docUrl), '/');
        @unlink($localPath);
    }
    error_log('Register club DB error: ' . $e->getMessage());
    if ($e->getCode() === '23000') {
        jsonError('An account with this email address already exists.', 409);
    }
    jsonError('A server error occurred. Please try again later.', 500);
}
