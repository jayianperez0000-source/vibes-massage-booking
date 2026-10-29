<?php
require_once __DIR__ . '/header.php';
require_once __DIR__ . '/db.php';

$tStmt = $pdo->query("SELECT * FROM therapists WHERE active = 1 ORDER BY id ASC");
$therapists = $tStmt->fetchAll();
?>

<div class="row justify-content-center">
  <div class="col-lg-10">

    <!-- Mission Header -->
    <div class="p-4 p-md-5 mb-4 rounded-4 text-white shadow" style="background: linear-gradient(135deg, #1c1917 0%, #064e3b 100%);">
      <span class="badge bg-success px-3 py-1 mb-2 rounded-pill small">
        <i class="bi bi-heart-fill text-danger me-1"></i> Community Empowerment
      </span>
      <h1 class="display-6 fw-bold mb-2 font-serif">Meet Our Visually Impaired Therapists</h1>
      <p class="lead mb-0 fs-6 opacity-90">
        Vibes Massage at Circle C Mall proudly employs professionally certified visually impaired massage specialists. With tactile precision and therapeutic mastery, our therapists relieve chronic stress and muscle tension.
      </p>
    </div>

    <!-- Therapists Cards Grid -->
    <div class="row g-4">
      <?php foreach ($therapists as $t): ?>
        <div class="col-md-6">
          <div class="card card-custom p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h2 class="h5 fw-bold font-serif mb-0 text-dark"><?= safe_output($t['name']) ?></h2>
                  <small class="text-success fw-bold"><?= safe_output($t['title']) ?> • <?= (int)$t['years_exp'] ?> Yrs Experience</small>
                </div>
                <span class="badge bg-light text-secondary border"><?= safe_output($t['gender']) ?></span>
              </div>

              <div class="badge bg-light text-dark border p-2 mb-2 d-inline-block small text-wrap text-start">
                🎯 <strong>Specialization:</strong> <?= safe_output($t['specialization']) ?>
              </div>

              <p class="text-muted small mt-2 leading-relaxed">
                <?= safe_output($t['bio']) ?>
              </p>
            </div>

            <div class="pt-3 border-top d-flex justify-content-between align-items-center mt-3">
              <span class="small text-muted"><i class="bi bi-geo-alt me-1"></i> Circle C Mall</span>
              <a href="index.php" class="btn btn-sm btn-emerald rounded-pill px-3 fw-bold">
                Book with <?= explode(' ', $t['name'])[0] ?> <i class="bi bi-arrow-right ms-1"></i>
              </a>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
