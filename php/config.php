<?php
/**
 * Vibes Massage Booking System - System Configuration & Security Helpers
 * Client: Vibes Massage (Circle C Mall, Quezon City Branch)
 * PHP Version: 8.x
 */

// Set Philippine Timezone
date_default_timezone_set('Asia/Manila');

// 1. Secure Session Management with 15-Minute Inactivity Expiry (Dev Guide Sec 5 & 7)
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$INACTIVITY_TIMEOUT = 15 * 60; // 15 minutes (900 seconds)

if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $INACTIVITY_TIMEOUT)) {
    // Session expired due to inactivity
    session_unset();
    session_destroy();
    session_start();
}
$_SESSION['last_activity'] = time();

// 2. Security Headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

// 3. Output Encoding (htmlspecialchars equivalent)
function safe_output($data) {
    return htmlspecialchars($data ?? '', ENT_QUOTES, 'UTF-8');
}

// 4. CSRF Protection
function generate_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token($token) {
    return !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token ?? '');
}

// 5. Activity Logging
function log_activity($pdo, $actor, $action, $details) {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $timestamp = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (timestamp, actor, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$timestamp, $actor, $action, $details, $ip]);
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}

// 6. Rate Limiting (5 Attempts Lockout)
function check_rate_limit($pdo, $ip, $action_type) {
    $now = time();
    $max_attempts = 5;
    $lockout_seconds = ($action_type === 'lookup') ? (10 * 60) : (15 * 60);

    $stmt = $pdo->prepare("SELECT * FROM rate_limit_logs WHERE ip = ? AND action_type = ?");
    $stmt->execute([$ip, $action_type]);
    $record = $stmt->fetch();

    if ($record) {
        if ($record['locked_until'] > $now) {
            $wait_mins = ceil(($record['locked_until'] - $now) / 60);
            return [
                'allowed' => false,
                'message' => "Too many failed attempts. Security cooldown active. Please try again in {$wait_mins} minute(s)."
            ];
        }

        if ($now - $record['last_attempt_at'] > $lockout_seconds) {
            $del = $pdo->prepare("DELETE FROM rate_limit_logs WHERE ip = ? AND action_type = ?");
            $del->execute([$ip, $action_type]);
            return ['allowed' => true, 'attempts_left' => $max_attempts];
        }

        return [
            'allowed' => true,
            'attempts_left' => max(0, $max_attempts - $record['attempts'])
        ];
    }

    return ['allowed' => true, 'attempts_left' => $max_attempts];
}

function record_failed_attempt($pdo, $ip, $action_type) {
    $now = time();
    $max_attempts = 5;
    $lockout_seconds = ($action_type === 'lookup') ? (10 * 60) : (15 * 60);

    $stmt = $pdo->prepare("SELECT * FROM rate_limit_logs WHERE ip = ? AND action_type = ?");
    $stmt->execute([$ip, $action_type]);
    $record = $stmt->fetch();

    if (!$record) {
        $ins = $pdo->prepare("
            INSERT INTO rate_limit_logs (ip, action_type, attempts, locked_until, last_attempt_at)
            VALUES (?, ?, 1, 0, ?)
        ");
        $ins->execute([$ip, $action_type, $now]);
        return ['allowed' => true, 'attempts_left' => $max_attempts - 1];
    } else {
        $new_attempts = $record['attempts'] + 1;
        $locked_until = ($new_attempts >= $max_attempts) ? ($now + $lockout_seconds) : 0;

        $upd = $pdo->prepare("
            UPDATE rate_limit_logs 
            SET attempts = ?, locked_until = ?, last_attempt_at = ?
            WHERE ip = ? AND action_type = ?
        ");
        $upd->execute([$new_attempts, $locked_until, $now, $ip, $action_type]);

        if ($locked_until > 0) {
            $wait_mins = ceil($lockout_seconds / 60);
            return [
                'allowed' => false,
                'message' => "Security limit reached: 5 consecutive failed attempts. Blocked for {$wait_mins} minutes."
            ];
        }

        return ['allowed' => true, 'attempts_left' => max(0, $max_attempts - $new_attempts)];
    }
}

function reset_rate_limit($pdo, $ip, $action_type) {
    $stmt = $pdo->prepare("DELETE FROM rate_limit_logs WHERE ip = ? AND action_type = ?");
    $stmt->execute([$ip, $action_type]);
}

// 7. Role-Based Access Control
function require_staff_login() {
    if (empty($_SESSION['staff_user'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: Valid staff session required. Session may have expired after 15 minutes of inactivity.'
        ]);
        exit;
    }
}
