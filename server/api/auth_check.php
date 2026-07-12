<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

$isAuth = false;
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    // Проверяем время последней активности (30 минут)
    $maxLifetime = 30 * 60; // 30 минут в секундах
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) < $maxLifetime) {
        $_SESSION['last_activity'] = time(); // обновляем время
        $isAuth = true;
    } else {
        // Сессия просрочена – удаляем
        session_unset();
        session_destroy();
    }
}

echo json_encode(['authenticated' => $isAuth]);