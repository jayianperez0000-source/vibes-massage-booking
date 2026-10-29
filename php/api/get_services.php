<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

try {
    $stmt = $pdo->query("SELECT id, name, duration_minutes, price_php, description FROM services");
    $services = $stmt->fetchAll();

    echo json_encode([
        'success'  => true,
        'services' => $services
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not fetch services.']);
}
