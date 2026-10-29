<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

require_staff_login();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $date = $_GET['date'] ?? '';
    $status = $_GET['status'] ?? 'all';
    $therapist_id = $_GET['therapist_id'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $sql = "
        SELECT b.*, t.name as therapist_name, t.title as therapist_title, s.price_php
        FROM bookings b
        LEFT JOIN therapists t ON b.therapist_id = t.id
        LEFT JOIN services s ON b.service_id = s.id
        WHERE 1=1
    ";
    $params = [];

    if (!empty($date)) {
        $sql .= " AND b.booking_date = ?";
        $params[] = $date;
    }
    if ($status !== 'all' && !empty($status)) {
        $sql .= " AND b.status = ?";
        $params[] = $status;
    }
    if ($therapist_id !== 'all' && !empty($therapist_id)) {
        $sql .= " AND b.therapist_id = ?";
        $params[] = (int)$therapist_id;
    }
    if (!empty($search)) {
        $sql .= " AND (b.reference_no LIKE ? OR b.customer_name LIKE ? OR b.contact_number LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $sql .= " ORDER BY b.booking_date DESC, b.start_time ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll();

    // Summary counts
    $today = date('Y-m-d');
    $tot = $pdo->query("SELECT COUNT(*) as c FROM bookings")->fetch()['c'];
    $act = $pdo->prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_date = ? AND status != 'Cancelled'");
    $act->execute([$today]);
    $actToday = $act->fetch()['c'];
    $pen = $pdo->query("SELECT COUNT(*) as c FROM bookings WHERE status = 'Pending'")->fetch()['c'];
    $com = $pdo->query("SELECT COUNT(*) as c FROM bookings WHERE status = 'Completed'")->fetch()['c'];

    echo json_encode([
        'success'  => true,
        'stats'    => [
            'totalBookings'     => (int)$tot,
            'todayActive'       => (int)$actToday,
            'pendingBookings'   => (int)$pen,
            'completedBookings' => (int)$com,
        ],
        'bookings' => $bookings
    ]);
    exit;
}

if ($method === 'PATCH' || $method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: $_POST;
    $action = $data['action'] ?? ($method === 'DELETE' ? 'delete' : ($method === 'PUT' ? 'edit' : 'status'));

    $booking_id = (int)($data['id'] ?? $_GET['id'] ?? 0);

    // 1. DELETE ACTION
    if ($action === 'delete' || $method === 'DELETE') {
        $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->execute([$booking_id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Booking not found.']);
            exit;
        }

        $del = $pdo->prepare("DELETE FROM bookings WHERE id = ?");
        $del->execute([$booking_id]);

        log_activity(
            $_SESSION['staff_user']['username'],
            'STAFF_DELETE_BOOKING',
            "Deleted booking {$existing['reference_no']} for {$existing['customer_name']}"
        );

        echo json_encode(['success' => true, 'message' => "Booking {$existing['reference_no']} permanently deleted."]);
        exit;
    }

    // 2. EDIT ACTION
    if ($action === 'edit' || $method === 'PUT') {
        $name = trim($data['customer_name'] ?? '');
        $contact = preg_replace('/[\s-]/', '', $data['contact_number'] ?? '');
        $service_id = $data['service_id'] ?? 'whole-body';
        $oil = ($data['oil_option'] ?? '') === 'Dry' ? 'Dry' : 'With Oil';
        $therapist_id = (int)($data['therapist_id'] ?? 1);
        $date = trim($data['booking_date'] ?? '');
        $start_time = trim($data['start_time'] ?? '');
        $status = $data['status'] ?? 'Pending';
        $notes = trim($data['notes'] ?? '');

        if (strlen($name) < 2) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Valid customer name is required.']);
            exit;
        }

        // Fetch service duration
        $svc = $pdo->prepare("SELECT name, duration_minutes FROM services WHERE id = ?");
        $svc->execute([$service_id]);
        $sRow = $svc->fetch();
        $service_name = $sRow ? $sRow['name'] : 'Whole Body Massage';
        $duration = $sRow ? (int)$sRow['duration_minutes'] : 60;

        list($sh, $sm) = explode(':', $start_time);
        $endMins = ((int)$sh * 60) + (int)$sm + $duration;
        $endTime = sprintf('%02d:%02d', floor($endMins / 60), $endMins % 60);

        // Conflict check
        $cStmt = $pdo->prepare("
            SELECT id FROM bookings
            WHERE therapist_id = ?
              AND booking_date = ?
              AND id != ?
              AND status != 'Cancelled'
              AND NOT (? >= end_time OR ? <= start_time)
        ");
        $cStmt->execute([$therapist_id, $date, $booking_id, $start_time, $endTime]);
        if ($cStmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Therapist is already booked for this slot.']);
            exit;
        }

        $upd = $pdo->prepare("
            UPDATE bookings
            SET customer_name = ?, contact_number = ?, service_id = ?, service_name = ?,
                oil_option = ?, therapist_id = ?, booking_date = ?, start_time = ?,
                end_time = ?, duration_minutes = ?, status = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([
            $name, $contact, $service_id, $service_name, $oil, $therapist_id,
            $date, $start_time, $endTime, $duration, $status, $notes, $booking_id
        ]);

        log_activity(
            $_SESSION['staff_user']['username'],
            'STAFF_EDIT_BOOKING',
            "Edited booking #{$booking_id} details for {$name}"
        );

        echo json_encode(['success' => true, 'message' => "Booking details updated successfully."]);
        exit;
    }

    // 3. STATUS UPDATE ACTION
    $new_status = $data['status'] ?? '';
    $valid_statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    if (!in_array($new_status, $valid_statuses)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid status value.']);
        exit;
    }

    $upd = $pdo->prepare("UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?");
    $upd->execute([$new_status, $booking_id]);

    log_activity(
        $_SESSION['staff_user']['username'],
        'UPDATE_BOOKING_STATUS',
        "Status of booking #{$booking_id} updated to {$new_status}"
    );

    echo json_encode(['success' => true, 'message' => "Booking status updated to {$new_status}."]);
    exit;
}
