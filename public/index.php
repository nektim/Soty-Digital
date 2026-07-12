<?php
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Проксируем запросы к /api/ в server/api/
if (strpos($requestUri, '/api/') === 0) {
    $apiFile = __DIR__ . '/../server/api/' . substr($requestUri, 5);
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    }
}

// Для всего остального — 404 (статика отдаётся веб-сервером самостоятельно)
http_response_code(404);
echo 'Not Found';