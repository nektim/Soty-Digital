<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

// Только для авторизованных администраторов
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    $_SESSION['last_activity'] = time(); // продлеваем сессию
}

// Параметр folder: image или screenshots
$folder = $_GET['folder'] ?? 'image';
$allowedFolders = ['image', 'screenshots'];
if (!in_array($folder, $allowedFolders)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверная папка']);
    exit;
}

// Проверяем, загружен ли файл
if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Файл не найден']);
    exit;
}

$file = $_FILES['file'];

// Проверка ошибок загрузки
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка загрузки файла']);
    exit;
}

// Проверка типа (разрешённые расширения)
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Недопустимый тип файла']);
    exit;
}

// Ограничение размера (например, 5 МБ)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Файл слишком большой (макс. 5 МБ)']);
    exit;
}

// Формируем уникальное имя файла с оригинальным расширением
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$newName = uniqid() . '.' . strtolower($ext);

// Путь для сохранения: public/client/sotydigital/{folder}/
$baseDir = __DIR__ . '/../../public/client/sotydigital/' . $folder;
if (!is_dir($baseDir)) {
    mkdir($baseDir, 0755, true);
}
$destPath = $baseDir . '/' . $newName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка сохранения файла']);
    exit;
}

// Возвращаем URL относительно корня сайта
$url = '/client/sotydigital/' . $folder . '/' . $newName;
echo json_encode(['success' => true, 'url' => $url]);