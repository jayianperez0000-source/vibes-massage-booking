<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

try {
    $stmt = $pdo->query("
        SELECT id, name, title, specialization, gender, bio, years_exp 
        FROM therapists 
        WHERE active = 1 
        ORDER BY id ASC
    ");
    $therapists = $stmt->fetchAll();

    echo json_encode([
        'success'    => true,
        'therapists' => $therapists
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Could not fetch therapists.']);
}
