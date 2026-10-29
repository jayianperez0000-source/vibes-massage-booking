<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/config.php';
$csrf_token = generate_csrf_token();
$current_page = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibes Massage - Secure Booking System (Circle C Mall)</title>
  <!-- Bootstrap 5 CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    :root {
      --primary-emerald: #065f46;
      --primary-dark: #064e3b;
      --accent-gold: #d97706;
      --bg-warm: #fbfbf9;
    }
    body {
      background-color: var(--bg-warm);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #292524;
    }
    .navbar-brand-title {
      font-family: Georgia, serif;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .badge-branch {
      background-color: #d1fae5;
      color: #065f46;
      font-weight: 600;
    }
    .btn-emerald {
      background-color: var(--primary-emerald);
      color: #ffffff;
      border: none;
    }
    .btn-emerald:hover {
      background-color: var(--primary-dark);
      color: #ffffff;
    }
    .card-custom {
      border: 1px solid #e7e5e4;
      border-radius: 1rem;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
  </style>
</head>
<body>

  <!-- Top Announcement Bar -->
  <div class="bg-dark text-white py-1 px-3 text-center small" style="background-color: #064e3b !important;">
    <div class="container d-flex flex-wrap justify-content-between align-items-center">
      <span><i class="bi bi-heart-fill text-danger me-1"></i> <strong>Vibes Massage</strong> • Circle C Mall Branch • Empowering visually impaired therapists</span>
      <span class="d-none d-md-inline"><i class="bi bi-clock me-1"></i> Open 10:00 AM – 9:00 PM Daily | Cash & GCash</span>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top py-2">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center" href="index.php">
        <div class="bg-success text-white rounded-3 p-2 me-2 d-flex align-items-center justify-center" style="width: 38px; height: 38px; background-color: var(--primary-emerald) !important;">
          <i class="bi bi-flower1"></i>
        </div>
        <div>
          <span class="navbar-brand-title fs-5 text-dark d-block leading-tight">Vibes Massage</span>
          <small class="text-muted" style="font-size: 11px;">Circle C Mall, Quezon City</small>
        </div>
      </a>

      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-1">
          <li class="nav-item">
            <a class="nav-link px-3 <?= $current_page === 'index.php' ? 'fw-bold text-success active' : '' ?>" href="index.php">
              <i class="bi bi-calendar-plus me-1"></i> Book Appointment
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link px-3 <?= $current_page === 'manage.php' ? 'fw-bold text-success active' : '' ?>" href="manage.php">
              <i class="bi bi-search me-1"></i> Manage Booking
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link px-3 <?= $current_page === 'therapists.php' ? 'fw-bold text-success active' : '' ?>" href="therapists.php">
              <i class="bi bi-people me-1"></i> Our Therapists
            </a>
          </li>
          <li class="nav-item ms-lg-2">
            <a class="btn btn-sm btn-outline-dark px-3 rounded-pill <?= $current_page === 'staff.php' ? 'active' : '' ?>" href="staff.php">
              <i class="bi bi-lock me-1"></i> Staff Portal
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <main class="py-4">
    <div class="container">
