<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

$date = $_GET['date'] ?? '';
$service_id = $_GET['service_id'] ?? 'whole-body';
$therapist_id = $_GET['therapist_id'] ?? '0';

if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valid date required (YYYY-MM-DD).']);
    exit;
}

$today = date('Y-m-d');
if ($date < $today) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Cannot select a past date.']);
    exit;
}

// Fetch service duration
$svcStmt = $pdo->prepare("SELECT duration_minutes FROM services WHERE id = ?");
$svcStmt->execute([$service_id]);
$service = $svcStmt->fetch();
$duration = $service ? (int)$service['duration_minutes'] : 60;

// Fetch therapists
$tStmt = $pdo->query("SELECT id, name FROM therapists WHERE active = 1");
$allTherapists = $tStmt->fetchAll();

$isNoPreference = empty($therapist_id) || $therapist_id === '0' || $therapist_id === 'any';
$targetTherapistId = $isNoPreference ? null : (int)$therapist_id;

// Fetch active bookings for this date using prepared statement
$bStmt = $pdo->prepare("
    SELECT therapist_id, start_time, end_time 
    FROM bookings 
    WHERE booking_date = ? AND status != 'Cancelled'
");
$bStmt->execute([$date]);
$existingBookings = $bStmt->fetchAll();

function timeToMins($t) {
    list($h, $m) = explode(':', $t);
    return ((int)$h * 60) + (int)$m;
}

function minsToTime($m) {
    $h = floor($m / 60);
    $min = $m % 60;
    return sprintf('%02d:%02d', $h, $min);
}

// Map bookings per therapist
$bookedIntervals = [];
foreach ($allTherapists as $t) {
    $bookedIntervals[$t['id']] = [];
}
foreach ($existingBookings as $b) {
    $tid = $b['therapist_id'];
    $bookedIntervals[$tid][] = [
        'start' => timeToMins($b['start_time']),
        'end'   => timeToMins($b['end_time']),
    ];
}

$openMins = 10 * 60;  // 10:00 AM
$closeMins = 21 * 60; // 9:00 PM
$stepMins = 10;

$nowMins = ((int)date('G') * 60) + (int)date('i');
$availableSlots = [];

for ($startM = $openMins; $startM + $duration <= $closeMins; $startM += $stepMins) {
    $endM = $startM + $duration;
    $timeStr = minsToTime($startM);
    $endTimeStr = minsToTime($endM);

    // If booking today, slot must be at least 20 minutes in future
    if ($date === $today && $startM <= $nowMins + 20) {
        continue;
    }

    $freeTherapistIds = [];

    if (!$isNoPreference && $targetTherapistId) {
        $intervals = $bookedIntervals[$targetTherapistId] ?? [];
        $hasOverlap = false;
        foreach ($intervals as $inv) {
            if ($startM < $inv['end'] && $endM > $inv['start']) {
                $hasOverlap = true;
                break;
            }
        }
        if (!$hasOverlap) {
            $freeTherapistIds[] = $targetTherapistId;
        }
    } else {
        foreach ($allTherapists as $t) {
            $intervals = $bookedIntervals[$t['id']] ?? [];
            $hasOverlap = false;
            foreach ($intervals as $inv) {
                if ($startM < $inv['end'] && $endM > $inv['start']) {
                    $hasOverlap = true;
                    break;
                }
            }
            if (!$hasOverlap) {
                $freeTherapistIds[] = $t['id'];
            }
        }
    }

    if (count($freeTherapistIds) > 0) {
        $availableSlots[] = [
            'time'                => $timeStr,
            'endTime'             => $endTimeStr,
            'available'           => true,
            'freeTherapistCount'  => count($freeTherapistIds),
            'candidateTherapistIds' => $freeTherapistIds,
        ];
    }
}

echo json_encode([
    'success'    => true,
    'date'       => $date,
    'duration'   => $duration,
    'totalSlots' => count($availableSlots),
    'slots'      => $availableSlots,
]);
