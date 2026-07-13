<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

$jsonFile = __DIR__ . '/../data/site_content.json';

function getSiteContent() {
    global $jsonFile;
    if (!file_exists($jsonFile)) return [];
    return json_decode(file_get_contents($jsonFile), true) ?: [];
}

function saveSiteContent($data) {
    global $jsonFile;
    file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// GET доступен без авторизации
if ($method === 'GET') {
    echo json_encode(getSiteContent());
    exit;
}

// PUT требует авторизации
if ($method !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Метод не поддерживается']);
    exit;
}

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Обновление данных
$newData = $input;
if (!is_array($newData)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

// Можно добавить валидацию отдельных полей, но для простоты просто сохраняем
saveSiteContent($newData);
echo json_encode(['success' => true]);