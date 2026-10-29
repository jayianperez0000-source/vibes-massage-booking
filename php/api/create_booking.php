<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$name           = trim($data['name'] ?? '');
$contact_number = trim($data['contact_number'] ?? '');
$service_id     = trim($data['service_id'] ?? 'whole-body');
$oil_option     = ($data['oil_option'] ?? '') === 'With Oil' ? 'With Oil' : 'Dry';
$therapist_id   = $data['therapist_id'] ?? '0';
$date           = trim($data['date'] ?? '');
$start_time     = trim($data['start_time'] ?? '');
$notes          = trim($data['notes'] ?? '');

// Server-side validation (Developer Guide Section 4.1 & 7)
if (strlen($name) < 2) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please provide a valid full name.']);
    exit;
}

$clean_phone = preg_replace('/[\s-]/', '', $contact_number);
if (strlen($clean_phone) < 7) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please enter a valid phone number.']);
    exit;
}

if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $date < date('Y-m-d')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Appointment date cannot be in the past.']);
    exit;
}

if (!$start_time || !preg_match('/^\d{2}:\d{2}$/', $start_time)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Please select an appointment time slot.']);
    exit;
}

// Fetch service
$svcStmt = $pdo->prepare("SELECT id, name, duration_minutes, price_php FROM services WHERE id = ?");
$svcStmt->execute([$service_id]);
$service = $svcStmt->fetch();
if (!$service) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid service type selected.']);
    exit;
}

$duration = (int)$service['duration_minutes'];
list($sh, $sm) = explode(':', $start_time);
$startMins = ((int)$sh * 60) + (int)$sm;
$endMins = $startMins + $duration;
$endTime = sprintf('%02d:%02d', floor($endMins / 60), $endMins % 60);

$isNoPreference = empty($therapist_id) || $therapist_id === '0' || $therapist_id === 'any';
$chosenTherapistId = null;
$chosenTherapistName = '';

if (!$isNoPreference) {
    $tid = (int)$therapist_id;
    $tStmt = $pdo->prepare("SELECT id, name FROM therapists WHERE id = ? AND active = 1");
    $tStmt->execute([$tid]);
    $therapist = $tStmt->fetch();
    if (!$therapist) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Selected therapist not found.']);
        exit;
    }

    // Check overlap using prepared statement
    $cStmt = $pdo->prepare("
        SELECT id FROM bookings
        WHERE therapist_id = ?
          AND booking_date = ?
          AND status != 'Cancelled'
          AND NOT (? >= end_time OR ? <= start_time)
    ");
    $cStmt->execute([$tid, $date, $start_time, $endTime]);
    if ($cStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'This slot is no longer available. Please choose another time.']);
        exit;
    }
    $chosenTherapistId = $tid;
    $chosenTherapistName = $therapist['name'];
} else {
    // Auto-assign available therapist with lowest workload
    $allT = $pdo->query("SELECT id, name FROM therapists WHERE active = 1")->fetchAll();
    $candidates = [];

    foreach ($allT as $t) {
        $cStmt = $pdo->prepare("
            SELECT id FROM bookings
            WHERE therapist_id = ?
              AND booking_date = ?
              AND status != 'Cancelled'
              AND NOT (? >= end_time OR ? <= start_time)
        ");
        $cStmt->execute([$t['id'], $date, $start_time, $endTime]);
        if (!$cStmt->fetch()) {
            $cnt = $pdo->prepare("SELECT COUNT(*) as c FROM bookings WHERE therapist_id = ? AND booking_date = ? AND status != 'Cancelled'");
            $cnt->execute([$t['id'], $date]);
            $load = (int)$cnt->fetch()['c'];
            $candidates[] = ['id' => $t['id'], 'name' => $t['name'], 'load' => $load];
        }
    }

    if (empty($candidates)) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'This slot is fully booked for all therapists.']);
        exit;
    }

    usort($candidates, fn($a, $b) => $a['load'] <=> $b['load']);
    $chosenTherapistId = $candidates[0]['id'];
    $chosenTherapistName = $candidates[0]['name'];
}

// Generate Reference Number: VM-YYYYMMDD-XXX
$datePart = str_replace('-', '', $date);
$seqStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM bookings WHERE booking_date = ?");
$seqStmt->execute([$date]);
$seq = str_pad((int)$seqStmt->fetch()['cnt'] + 1, 3, '0', STR_PAD_LEFT);
$reference_no = "VM-{$datePart}-{$seq}";

$now = date('Y-m-d H:i:s');

// Prepared statement insert
$ins = $pdo->prepare("
    INSERT INTO bookings (
        reference_no, customer_name, contact_number, service_id, service_name,
        oil_option, therapist_id, booking_date, start_time, end_time, duration_minutes,
        status, created_at, updated_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)
");

$ins->execute([
    $reference_no,
    $name,
    $clean_phone,
    $service['id'],
    $service['name'],
    $oil_option,
    $chosenTherapistId,
    $date,
    $start_time,
    $endTime,
    $duration,
    $now,
    $now,
    $notes
]);

log_activity($pdo, $name, 'BOOKING_CREATED', "Booking {$reference_no} created for {$date} {$start_time}-{$endTime}");

echo json_encode([
    'success' => true,
    'message' => 'Booking confirmed successfully!',
    'booking' => [
        'reference_no'     => $reference_no,
        'customer_name'    => safe_output($name),
        'contact_number'   => safe_output($clean_phone),
        'service_id'       => $service['id'],
        'service_name'     => $service['name'],
        'price_php'        => (float)$service['price_php'],
        'oil_option'       => $oil_option,
        'therapist_id'     => $chosenTherapistId,
        'therapist_name'   => safe_output($chosenTherapistName),
        'booking_date'     => $date,
        'start_time'       => $start_time,
        'end_time'         => $endTime,
        'duration_minutes' => $duration,
        'status'           => 'Pending',
        'created_at'       => $now,
        'notes'            => safe_output($notes),
    ]
]);
