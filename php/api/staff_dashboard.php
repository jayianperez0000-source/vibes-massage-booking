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

if ($method === 'PATCH' || $method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true) ?: $_POST;

    $booking_id = (int)($data['id'] ?? 0);
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
