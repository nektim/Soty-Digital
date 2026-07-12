<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 0);   // только если HTTPS
ini_set('session.cookie_samesite', 'Strict');
header('Content-Type: application/json');

// Подключаем конфигурацию
$configFile = __DIR__ . '/../config.php';
if (!file_exists($configFile)) {
    echo json_encode(['success' => false, 'message' => 'Ошибка конфигурации сервера']);
    exit;
}
require_once $configFile;

if (!defined('ADMIN_LOGIN') || !defined('ADMIN_PASSWORD_HASH')) {
    echo json_encode(['success' => false, 'message' => 'Неполная конфигурация']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$login = $data['login'] ?? '';
$password = $data['password'] ?? '';

// Правильная проверка: password_verify() возвращает true/false
if ($login === ADMIN_LOGIN && password_verify($password, ADMIN_PASSWORD_HASH)) {
    $_SESSION['admin_logged_in'] = true;
    $_SESSION['last_activity'] = time();  // запоминаем время входа
    session_regenerate_id(true);          // защита от Session Fixation
    echo json_encode(['success' => true]);
    exit;
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Неверный логин или пароль']);
    exit;
}