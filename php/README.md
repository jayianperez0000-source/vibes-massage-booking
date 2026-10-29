# Vibes Massage — PHP 8.x + MySQL Backend

This folder contains the complete, production-ready **PHP 8.x** backend designed according to Chapter IV and the Developer Guide for **Vibes Massage (Circle C Mall branch)**.

---

## Folder Contents
* `config.php` — 15-minute session timeout, CSRF tokens, rate limiting helper, and activity logging.
* `db.php` — PDO MySQL connection with prepared statements and secure error handling.
* `api/get_services.php` — JSON list of massage services.
* `api/get_therapists.php` — JSON list of the 10 licensed visually impaired therapists.
* `api/check_availability.php` — Dynamic 10-minute slot engine with conflict detection.
* `api/create_booking.php` — Server-side validation, reference generator (`VM-YYYYMMDD-XXX`), and prepared statement insert.
* `api/manage_booking.php` — 5-attempt rate-limited lookup, reschedule with availability check, and cancellation.
* `api/staff_login.php` — Staff authentication using `password_verify()` with brute-force rate limit protection.
* `api/staff_dashboard.php` — Role-protected bookings list and status updates.
* `api/export_xml.php` — Secure XML export generator with XXE protection (`libxml_disable_entity_loader`).

---

## How to Run in XAMPP

1. Copy the `php/` directory to your XAMPP web root:
   ```
   C:\xampp\htdocs\vibes_massage\
   ```
2. Start **Apache** and **MySQL** in XAMPP Control Panel.
3. Import `vibes_massage_mysql.sql` into phpMyAdmin (`http://localhost/phpmyadmin`).
4. Test any endpoint in your browser:
   ```
   http://localhost/vibes_massage/api/get_services.php
   ```
