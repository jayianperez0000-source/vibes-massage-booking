<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

require_staff_login();

// Disable external entity loading to prevent XXE attacks (Dev Guide Sec 4 & 7)
if (function_exists('libxml_disable_entity_loader')) {
    libxml_disable_entity_loader(true);
}

$start_date = $_GET['start_date'] ?? '2026-01-01';
$end_date = $_GET['end_date'] ?? '2026-12-31';

$stmt = $pdo->prepare("
    SELECT b.*, t.name as therapist_name, s.name as service_title
    FROM bookings b
    LEFT JOIN therapists t ON b.therapist_id = t.id
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.booking_date >= ? AND b.booking_date <= ?
    ORDER BY b.booking_date ASC, b.start_time ASC
");
$stmt->execute([$start_date, $end_date]);
$bookings = $stmt->fetchAll();

$dom = new DOMDocument('1.0', 'UTF-8');
$dom->formatOutput = true;

$root = $dom->createElement('bookings_export');
$root->setAttribute('generated_at', date('c'));
$root->setAttribute('exported_by', $_SESSION['staff_user']['full_name']);
$dom->appendChild($root);

$meta = $dom->createElement('metadata');
$meta->appendChild($dom->createElement('branch', 'Circle C Mall, Quezon City'));
$meta->appendChild($dom->createElement('date_range_start', $start_date));
$meta->appendChild($dom->createElement('date_range_end', $end_date));
$meta->appendChild($dom->createElement('total_records', (string)count($bookings)));
$root->appendChild($meta);

$records = $dom->createElement('records');
foreach ($bookings as $b) {
    $item = $dom->createElement('booking');
    $item->setAttribute('id', (string)$b['id']);
    
    $item->appendChild($dom->createElement('reference_number', $b['reference_no']));
    $item->appendChild($dom->createElement('date', $b['booking_date']));
    $item->appendChild($dom->createElement('start_time', $b['start_time']));
    $item->appendChild($dom->createElement('end_time', $b['end_time']));
    $item->appendChild($dom->createElement('duration_minutes', (string)$b['duration_minutes']));
    $item->appendChild($dom->createElement('service_name', $b['service_name']));
    $item->appendChild($dom->createElement('oil_option', $b['oil_option']));
    $item->appendChild($dom->createElement('therapist_name', $b['therapist_name'] ?? 'Unassigned'));
    $item->appendChild($dom->createElement('customer_name', $b['customer_name']));
    $item->appendChild($dom->createElement('contact_number', $b['contact_number']));
    $item->appendChild($dom->createElement('status', $b['status']));
    $item->appendChild($dom->createElement('created_at', $b['created_at']));
    if (!empty($b['notes'])) {
        $item->appendChild($dom->createElement('notes', $b['notes']));
    }

    $records->appendChild($item);
}
$root->appendChild($records);

log_activity(
    $_SESSION['staff_user']['username'],
    'EXPORT_BOOKINGS_XML',
    "Exported " . count($bookings) . " records for range {$start_date} to {$end_date}"
);

$filename = "vibes-bookings-{$start_date}-to-{$end_date}.xml";
header('Content-Type: application/xml; charset=utf-8');
header("Content-Disposition: attachment; filename=\"{$filename}\"");

echo $dom->saveXML();
