<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

$ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$action = $data['action'] ?? 'lookup';

// ----------------------------------------------------
// 1. LOOKUP
// ----------------------------------------------------
if ($action === 'lookup') {
    $rate = check_rate_limit($pdo, $ip, 'lookup');
    if (!$rate['allowed']) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => $rate['message'], 'locked' => true]);
        exit;
    }

    $ref = strtoupper(trim($data['reference_no'] ?? ''));
    $contact = preg_replace('/[\s-]/', '', $data['contact_number'] ?? '');

    $stmt = $pdo->prepare("
        SELECT b.*, t.name as therapist_name, t.title as therapist_title, s.price_php
        FROM bookings b
        LEFT JOIN therapists t ON b.therapist_id = t.id
        LEFT JOIN services s ON b.service_id = s.id
        WHERE UPPER(b.reference_no) = ?
    ");
    $stmt->execute([$ref]);
    $booking = $stmt->fetch();

    $dbContact = preg_replace('/[\s-]/', '', $booking['contact_number'] ?? '');

    if (!$booking || $dbContact !== $contact) {
        $failed = record_failed_attempt($pdo, $ip, 'lookup');
        log_activity($pdo, 'Anonymous', 'LOOKUP_FAILED', "Failed lookup attempt for {$ref}");

        http_response_code(404);
        echo json_encode([
            'success'       => false,
            'error'         => "We couldn't find a booking with those details. Please check your reference and contact number.",
            'attempts_left' => $failed['attempts_left'] ?? 0,
            'locked'        => !empty($failed['message']),
        ]);
        exit;
    }

    reset_rate_limit($pdo, $ip, 'lookup');

    echo json_encode([
        'success' => true,
        'booking' => [
            'id'                  => (int)$booking['id'],
            'reference_no'        => safe_output($booking['reference_no']),
            'customer_name'       => safe_output($booking['customer_name']),
            'contact_number'      => safe_output($booking['contact_number']),
            'service_id'          => $booking['service_id'],
            'service_name'        => safe_output($booking['service_name']),
            'price_php'           => (float)$booking['price_php'],
            'oil_option'          => $booking['oil_option'],
            'therapist_id'        => (int)$booking['therapist_id'],
            'therapist_name'      => safe_output($booking['therapist_name']),
            'therapist_title'     => safe_output($booking['therapist_title']),
            'booking_date'        => $booking['booking_date'],
            'start_time'          => $booking['start_time'],
            'end_time'            => $booking['end_time'],
            'duration_minutes'    => (int)$booking['duration_minutes'],
            'status'              => $booking['status'],
            'created_at'          => $booking['created_at'],
            'notes'               => safe_output($booking['notes']),
            'cancellation_reason' => safe_output($booking['cancellation_reason']),
        ]
    ]);
    exit;
}

// ----------------------------------------------------
// 2. RESCHEDULE
// ----------------------------------------------------
if ($action === 'reschedule') {
    $ref = strtoupper(trim($data['reference_no'] ?? ''));
    $contact = preg_replace('/[\s-]/', '', $data['contact_number'] ?? '');
    $new_date = trim($data['new_date'] ?? '');
    $new_time = trim($data['new_time'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE UPPER(reference_no) = ?");
    $stmt->execute([$ref]);
    $booking = $stmt->fetch();

    $dbContact = preg_replace('/[\s-]/', '', $booking['contact_number'] ?? '');
    if (!$booking || $dbContact !== $contact) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Verification failed.']);
        exit;
    }

    if ($booking['status'] === 'Cancelled') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Cancelled bookings cannot be rescheduled.']);
        exit;
    }

    $duration = (int)$booking['duration_minutes'];
    list($sh, $sm) = explode(':', $new_time);
    $endMins = ((int)$sh * 60) + (int)$sm + $duration;
    $endTime = sprintf('%02d:%02d', floor($endMins / 60), $endMins % 60);

    // Overlap check
    $cStmt = $pdo->prepare("
        SELECT id FROM bookings
        WHERE therapist_id = ?
          AND booking_date = ?
          AND id != ?
          AND status != 'Cancelled'
          AND NOT (? >= end_time OR ? <= start_time)
    ");
    $cStmt->execute([$booking['therapist_id'], $new_date, $booking['id'], $new_time, $endTime]);
    if ($cStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Therapist is unavailable at this new time.']);
        exit;
    }

    $now = date('Y-m-d H:i:s');
    $upd = $pdo->prepare("
        UPDATE bookings 
        SET booking_date = ?, start_time = ?, end_time = ?, updated_at = ?
        WHERE id = ?
    ");
    $upd->execute([$new_date, $new_time, $endTime, $now, $booking['id']]);

    log_activity($pdo, $booking['customer_name'], 'BOOKING_RESCHEDULED', "Booking {$ref} rescheduled to {$new_date} {$new_time}");

    echo json_encode(['success' => true, 'message' => 'Appointment rescheduled successfully!']);
    exit;
}

// ----------------------------------------------------
// 3. CANCEL
// ----------------------------------------------------
if ($action === 'cancel') {
    $ref = strtoupper(trim($data['reference_no'] ?? ''));
    $contact = preg_replace('/[\s-]/', '', $data['contact_number'] ?? '');
    $reason = trim($data['reason'] ?? 'Cancelled by customer');

    $stmt = $pdo->prepare("SELECT * FROM bookings WHERE UPPER(reference_no) = ?");
    $stmt->execute([$ref]);
    $booking = $stmt->fetch();

    $dbContact = preg_replace('/[\s-]/', '', $booking['contact_number'] ?? '');
    if (!$booking || $dbContact !== $contact) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Verification failed.']);
        exit;
    }

    $now = date('Y-m-d H:i:s');
    // Mark as cancelled, retain record for staff reporting
    $upd = $pdo->prepare("UPDATE bookings SET status = 'Cancelled', cancellation_reason = ?, updated_at = ? WHERE id = ?");
    $upd->execute([$reason, $now, $booking['id']]);

    log_activity($pdo, $booking['customer_name'], 'BOOKING_CANCELLED', "Booking {$ref} marked as cancelled. Reason: {$reason}");

    echo json_encode(['success' => true, 'message' => 'Booking cancelled successfully.']);
    exit;
}
