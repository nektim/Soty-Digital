<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: application/json');

$jsonFile = __DIR__ . '/../data/projects.json';

// Нормализация пути: заменяет \ на /, добавляет ведущий / если нужно
function normalizePath($path) {
    if (empty($path)) return $path;
    $path = str_replace('\\', '/', $path);
    // Если это не абсолютный URL (http...) и не начинается с /, добавляем /
    if (!preg_match('#^(https?:)?//#', $path) && $path[0] !== '/') {
        $path = '/' . $path;
    }
    return $path;
}

function getProjects() {
    global $jsonFile;
    if (!file_exists($jsonFile)) return [];
    return json_decode(file_get_contents($jsonFile), true) ?: [];
}

function saveProjects($projects) {
    global $jsonFile;
    file_put_contents($jsonFile, json_encode($projects, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// GET-запросы доступны без авторизации (публичный доступ)
if ($method === 'GET') {
    echo json_encode(getProjects());
    exit;
}

// Все остальные методы требуют авторизации
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    $_SESSION['last_activity'] = time(); // продлеваем сессию
}

switch ($method) {
    case 'POST':
        $projects = getProjects();
        $newProject = $input;
        if (empty($newProject['title']) || empty($newProject['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Заголовок и ID обязательны']);
            exit;
        }
        // Проверка уникальности ID
        foreach ($projects as $p) {
            if ($p['id'] == $newProject['id']) {
                http_response_code(409);
                echo json_encode(['error' => 'Проект с таким ID уже существует']);
                exit;
            }
        }
        // Формируем ссылку
        $newProject['link'] = 'project/project.html?id=' . $newProject['id'];
        // Приводим screenshots к массиву, если пришла строка
        if (isset($newProject['screenshots']) && is_string($newProject['screenshots'])) {
            $newProject['screenshots'] = array_filter(array_map('trim', explode("\n", $newProject['screenshots'])));
        }
        $projects[] = $newProject;
        saveProjects($projects);
        echo json_encode(['success' => true]);
        break;

    case 'PUT':
        $projects = getProjects();
        $updated = $input;
        $id = $updated['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID обязателен']);
            exit;
        }
        $found = false;
        foreach ($projects as &$p) {
            if ($p['id'] == $id) {
                $p['title'] = $updated['title'] ?? $p['title'];
                $p['shortDescription'] = $updated['shortDescription'] ?? $p['shortDescription'];
                $p['image'] = $updated['image'] ?? $p['image'];
                $p['fullDescription'] = $updated['fullDescription'] ?? $p['fullDescription'];
                if (isset($updated['screenshots'])) {
                    $p['screenshots'] = is_string($updated['screenshots'])
                        ? array_filter(array_map('trim', explode("\n", $updated['screenshots'])))
                        : $updated['screenshots'];
                }
                $p['link'] = 'project/project.html?id=' . $p['id'];
                $found = true;
                break;
            }
        }
        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Проект не найден']);
            exit;
        }
        saveProjects($projects);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID обязателен']);
            exit;
        }
        $projects = getProjects();
        $newProjects = array_values(array_filter($projects, fn($p) => $p['id'] != $id));
        if (count($newProjects) === count($projects)) {
            http_response_code(404);
            echo json_encode(['error' => 'Проект не найден']);
            exit;
        }
        saveProjects($newProjects);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Метод не поддерживается']);
}