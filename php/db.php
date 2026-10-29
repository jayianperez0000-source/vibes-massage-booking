<?php
/**
 * Vibes Massage - Database Connection Module (XAMPP / MySQL)
 * Branch: Circle C Mall, Quezon City
 */

header('Content-Type: application/json; charset=UTF-8');

// Default XAMPP MySQL Settings
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_port = getenv('DB_PORT') ?: '3306';
$db_name = getenv('DB_NAME') ?: 'vibes_massage';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: ''; // Default XAMPP password is empty

try {
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false, // Enforces native MySQL prepared statements
    ]);
} catch (PDOException $e) {
    // Generic error message without revealing internal credentials or database paths
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Database connection failed. Please ensure MySQL is running in XAMPP and the database is imported.'
    ]);
    exit;
}
