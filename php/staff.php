<?php
require_once __DIR__ . '/header.php';
$is_logged_in = !empty($_SESSION['staff_user']);
?>

<div class="row justify-content-center">
  <div class="col-lg-11">

    <?php if (!$is_logged_in): ?>
      <!-- Staff Login Card (Appendix B Wireframe) -->
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
          <div class="card card-custom p-4 p-md-5">
            <div class="text-center mb-4">
              <div class="bg-success text-white rounded-circle d-inline-flex align-items-center justify-center p-3 mb-2" style="width: 55px; height: 55px; background-color: var(--primary-emerald) !important;">
                <i class="bi bi-lock-fill fs-4"></i>
              </div>
              <h1 class="h4 fw-bold font-serif mb-1">Staff Login</h1>
              <p class="text-muted small">Circle C Mall branch staff access</p>
            </div>

            <div id="loginAlert" class="alert alert-danger d-none" role="alert"></div>

            <form id="loginForm" class="space-y-3">
              <div class="mb-3">
                <label for="username" class="form-label small fw-bold text-uppercase text-secondary">Username</label>
                <input type="text" class="form-control" id="username" required>
              </div>

              <div class="mb-3">
                <label for="password" class="form-label small fw-bold text-uppercase text-secondary">Password</label>
                <input type="password" class="form-control" id="password" required>
              </div>

              <button type="submit" id="btnLogin" class="btn btn-emerald w-100 py-2 rounded-pill fw-bold shadow-sm">
                Log In
              </button>
            </form>

            <div class="mt-4 pt-3 border-top text-muted small">
              <span class="d-block text-uppercase fw-bold text-secondary mb-1" style="font-size: 11px;">Demo Accounts:</span>
              <div class="p-2 bg-light rounded border mb-1 cursor-pointer" onclick="fillLogin('gelyn_perez', 'Vibes2026!')">
                <strong>Ms. Gelyn Perez</strong> (Manager): <code>gelyn_perez / Vibes2026!</code>
              </div>
              <div class="p-2 bg-light rounded border cursor-pointer" onclick="fillLogin('admin', 'Admin123!')">
                <strong>System Admin</strong>: <code>admin / Admin123!</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script>
      function fillLogin(u, p) {
        document.getElementById('username').value = u;
        document.getElementById('password').value = p;
      }

      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('loginAlert');
        alertBox.classList.add('d-none');

        const btn = document.getElementById('btnLogin');
        btn.disabled = true;
        btn.textContent = 'Verifying...';

        try {
          const res = await fetch('api/staff_login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: document.getElementById('username').value,
              password: document.getElementById('password').value
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            location.reload();
          } else {
            alertBox.textContent = data.error || 'Incorrect username or password.';
            alertBox.classList.remove('d-none');
          }
        } catch (err) {
          alertBox.textContent = 'Network communication error.';
          alertBox.classList.remove('d-none');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Log In';
        }
      });
      </script>

    <?php else: ?>
      <!-- Staff Dashboard (Appendix B Wireframe & Dev Guide Sec 5.2) -->
      <div class="d-flex flex-wrap justify-content-between align-items-center bg-dark text-white p-4 rounded-4 mb-4 shadow" style="background-color: #1c1917 !important;">
        <div>
          <span class="badge bg-success px-3 py-1 rounded-pill small mb-1">
            <?= strtoupper($_SESSION['staff_user']['role']) ?> PORTAL
          </span>
          <h2 class="h4 fw-bold font-serif mb-0 text-white">Welcome, <?= safe_output($_SESSION['staff_user']['full_name']) ?></h2>
          <small class="text-secondary">Vibes Massage • Circle C Mall Branch</small>
        </div>

        <div class="d-flex align-items-center gap-2 mt-3 mt-md-0">
          <span class="badge bg-secondary p-2 font-monospace small"><i class="bi bi-clock me-1"></i> 15-min Session Active</span>
          <button class="btn btn-sm btn-outline-light rounded-pill px-3" onclick="showExportDialog()">
            <i class="bi bi-file-earmark-code me-1"></i> Export XML
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="logoutStaff()">
            <i class="bi bi-box-arrow-right me-1"></i> Log Out
          </button>
        </div>
      </div>

      <!-- Dashboard Statistics Row -->
      <div class="row g-3 mb-4" id="statsRow">
        <div class="col-sm-6 col-lg-3">
          <div class="card card-custom p-3 border-start border-4 border-success">
            <span class="text-muted small text-uppercase">Today's Active</span>
            <h3 class="fw-bold mb-0 mt-1" id="statToday">--</h3>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card card-custom p-3 border-start border-4 border-warning">
            <span class="text-muted small text-uppercase">Pending</span>
            <h3 class="fw-bold mb-0 mt-1 text-warning" id="statPending">--</h3>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card card-custom p-3 border-start border-4 border-info">
            <span class="text-muted small text-uppercase">Completed</span>
            <h3 class="fw-bold mb-0 mt-1 text-info" id="statCompleted">--</h3>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card card-custom p-3 border-start border-4 border-dark">
            <span class="text-muted small text-uppercase">Total Records</span>
            <h3 class="fw-bold mb-0 mt-1" id="statTotal">--</h3>
          </div>
        </div>
      </div>

      <!-- Bookings Table Card (Matching Wireframe) -->
      <div class="card card-custom p-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-3 border-bottom gap-2">
          <h3 class="h5 fw-bold font-serif mb-0">Booking Appointments</h3>
          <div class="d-flex gap-2">
            <input type="date" class="form-control form-control-sm" id="filterDate" onchange="loadBookings()">
            <select class="form-select form-select-sm" id="filterStatus" onchange="loadBookings()">
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle small mb-0">
            <thead class="table-light">
              <tr>
                <th>Time & Date</th>
                <th>Reference</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Therapist</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody id="bookingsTableBody">
              <tr><td colspan="7" class="text-center py-4 text-muted">Loading bookings...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Export XML Modal -->
      <div class="modal fade" id="xmlModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content rounded-4 border-0 shadow">
            <div class="modal-header border-bottom">
              <h5 class="modal-title font-serif fw-bold"><i class="bi bi-file-earmark-code text-success me-1"></i> Export Booking Data (XML)</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small">Exports appointments formatted in XML for record-keeping per project specification.</p>
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label small fw-bold">Start Date</label>
                  <input type="date" id="xmlStart" class="form-control form-control-sm" value="<?= date('Y-m-01') ?>">
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold">End Date</label>
                  <input type="date" id="xmlEnd" class="form-control form-control-sm" value="<?= date('Y-m-t') ?>">
                </div>
              </div>
              <div class="p-2 bg-light rounded border small text-success">
                <i class="bi bi-shield-check me-1"></i> XXE Protection Enabled (External entities disabled)
              </div>
            </div>
            <div class="modal-footer border-top">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-sm btn-emerald rounded-pill px-4 fw-bold" onclick="downloadXml()">
                <i class="bi bi-download me-1"></i> Download XML
              </button>
            </div>
          </div>
        </div>
      </div>

      <script>
      document.addEventListener('DOMContentLoaded', loadBookings);

      function loadBookings() {
        const d = document.getElementById('filterDate').value;
        const s = document.getElementById('filterStatus').value;
        const tbody = document.getElementById('bookingsTableBody');

        fetch(`api/staff_dashboard.php?date=${d}&status=${s}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              document.getElementById('statToday').textContent = data.stats.todayActive;
              document.getElementById('statPending').textContent = data.stats.pendingBookings;
              document.getElementById('statCompleted').textContent = data.stats.completedBookings;
              document.getElementById('statTotal').textContent = data.stats.totalBookings;

              if (data.bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No appointments found.</td></tr>';
                return;
              }

              tbody.innerHTML = '';
              data.bookings.forEach(b => {
                const tr = document.createElement('tr');
                const badgeClass = b.status === 'Confirmed' ? 'bg-success' : b.status === 'Pending' ? 'bg-warning text-dark' : b.status === 'Completed' ? 'bg-info text-dark' : 'bg-danger';

                tr.innerHTML = `
                  <td><strong>${b.start_time} - ${b.end_time}</strong><br><small class="text-muted">${b.booking_date}</small></td>
                  <td><code>${b.reference_no}</code></td>
                  <td><strong>${b.customer_name}</strong><br><small class="text-muted">${b.contact_number}</small></td>
                  <td>${b.service_name}<br><small class="text-success">${b.oil_option} • ${b.duration_minutes}m</small></td>
                  <td>${b.therapist_name || 'Unassigned'}</td>
                  <td><span class="badge ${badgeClass} rounded-pill">${b.status}</span></td>
                  <td class="text-end">
                    ${b.status === 'Pending' ? `<button class="btn btn-xs btn-success btn-sm rounded-pill" onclick="updateStatus(${b.id}, 'Confirmed')">Confirm</button>` : ''}
                    ${b.status === 'Confirmed' ? `<button class="btn btn-xs btn-info btn-sm rounded-pill text-dark" onclick="updateStatus(${b.id}, 'Completed')">Complete</button>` : ''}
                    ${b.status !== 'Cancelled' && b.status !== 'Completed' ? `<button class="btn btn-xs btn-outline-danger btn-sm rounded-pill ms-1" onclick="updateStatus(${b.id}, 'Cancelled')">Cancel</button>` : ''}
                  </td>
                `;
                tbody.appendChild(tr);
              });
            }
          });
      }

      function updateStatus(id, newStatus) {
        fetch('api/staff_dashboard.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, status: newStatus })
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) loadBookings();
        });
      }

      function showExportDialog() {
        const modal = new bootstrap.Modal(document.getElementById('xmlModal'));
        modal.show();
      }

      function downloadXml() {
        const start = document.getElementById('xmlStart').value;
        const end = document.getElementById('xmlEnd').value;
        window.location.href = `api/export_xml.php?start_date=${start}&end_date=${end}`;
      }

      function logoutStaff() {
        fetch('api/staff_login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        }).finally(() => {
          location.href = 'index.php';
        });
      }
      </script>
    <?php endif; ?>

  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
