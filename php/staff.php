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
                  <td class="text-end whitespace-nowrap">
                    <div class="btn-group btn-group-sm">
                      ${b.status === 'Pending' ? `<button class="btn btn-success btn-sm rounded-pill me-1" onclick="updateStatus(${b.id}, 'Confirmed')">Confirm</button>` : ''}
                      ${b.status === 'Confirmed' ? `<button class="btn btn-info btn-sm text-dark rounded-pill me-1" onclick="updateStatus(${b.id}, 'Completed')">Complete</button>` : ''}
                      ${b.status !== 'Cancelled' && b.status !== 'Completed' ? `<button class="btn btn-outline-secondary btn-sm rounded-pill me-1" onclick="updateStatus(${b.id}, 'Cancelled')">Cancel</button>` : ''}
                      <button class="btn btn-outline-primary btn-sm rounded-pill me-1" onclick="openEditModal(${b.id})" title="Edit Booking"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="openDeleteModal(${b.id}, '${b.reference_no}', '${b.customer_name.replace(/'/g, "\\'")}')" title="Delete Booking"><i class="bi bi-trash"></i></button>
                    </div>
                  </td>
                `;
                tbody.appendChild(tr);
              });
            }
          });
      }

      let currentBookings = [];
      let deleteTargetId = null;

      function openEditModal(id) {
        fetch(`api/staff_dashboard.php`)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              const b = data.bookings.find(item => item.id == id);
              if (b) {
                document.getElementById('editId').value = b.id;
                document.getElementById('editRef').textContent = b.reference_no;
                document.getElementById('editName').value = b.customer_name;
                document.getElementById('editPhone').value = b.contact_number;
                document.getElementById('editService').value = b.service_id;
                document.getElementById('editOil').value = b.oil_option;
                document.getElementById('editTherapist').value = b.therapist_id;
                document.getElementById('editStatus').value = b.status;
                document.getElementById('editDate').value = b.booking_date;
                document.getElementById('editTime').value = b.start_time;
                document.getElementById('editNotes').value = b.notes || '';
                new bootstrap.Modal(document.getElementById('editModal')).show();
              }
            }
          });
      }

      function submitEditBooking(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const payload = {
          action: 'edit',
          id: id,
          customer_name: document.getElementById('editName').value,
          contact_number: document.getElementById('editPhone').value,
          service_id: document.getElementById('editService').value,
          oil_option: document.getElementById('editOil').value,
          therapist_id: document.getElementById('editTherapist').value,
          status: document.getElementById('editStatus').value,
          booking_date: document.getElementById('editDate').value,
          start_time: document.getElementById('editTime').value,
          notes: document.getElementById('editNotes').value,
        };

        fetch('api/staff_dashboard.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadBookings();
          } else {
            alert(data.error || 'Could not update booking.');
          }
        });
      }

      function openDeleteModal(id, ref, name) {
        deleteTargetId = id;
        document.getElementById('deleteTargetRef').textContent = ref;
        document.getElementById('deleteTargetName').textContent = name;
        new bootstrap.Modal(document.getElementById('deleteModal')).show();
      }

      function confirmDeleteBooking() {
        if (!deleteTargetId) return;
        fetch('api/staff_dashboard.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: deleteTargetId })
        })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            loadBookings();
          } else {
            alert(data.error || 'Could not delete booking.');
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

      <!-- Edit Booking Modal (PHP) -->
      <div class="modal fade" id="editModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content rounded-4 border-0 shadow">
            <div class="modal-header border-bottom">
              <h5 class="modal-title font-serif fw-bold"><i class="bi bi-pencil-square text-success me-1"></i> Edit Appointment (<span id="editRef"></span>)</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <form onsubmit="submitEditBooking(event)">
              <div class="modal-body">
                <input type="hidden" id="editId">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Customer Full Name *</label>
                    <input type="text" class="form-control" id="editName" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Contact Number *</label>
                    <input type="tel" class="form-control" id="editPhone" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Service</label>
                    <select class="form-select" id="editService">
                      <option value="whole-body">Whole Body Massage (60m - ₱350)</option>
                      <option value="body-parts">Body Parts Massage (30m - ₱200)</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Medium</label>
                    <select class="form-select" id="editOil">
                      <option value="With Oil">With Oil</option>
                      <option value="Dry">Dry (Acupressure)</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Assigned Therapist</label>
                    <select class="form-select" id="editTherapist">
                      <option value="1">Eduardo "Kuya Ed" Ramos</option>
                      <option value="2">Maria Santos</option>
                      <option value="3">Roberto Cruz</option>
                      <option value="4">Teresa Mendoza</option>
                      <option value="5">Juan Bautista</option>
                      <option value="6">Elena Reyes</option>
                      <option value="7">Ricardo Aquino</option>
                      <option value="8">Grace Dela Cruz</option>
                      <option value="9">Antonio Morales</option>
                      <option value="10">Carmela Flores</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Status</label>
                    <select class="form-select" id="editStatus">
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Date</label>
                    <input type="date" class="form-control" id="editDate" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Start Time (HH:MM)</label>
                    <input type="text" class="form-control" id="editTime" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" required>
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-bold">Notes</label>
                    <textarea class="form-control" id="editNotes" rows="2"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer border-top">
                <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-sm btn-success rounded-pill px-4 fw-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal (PHP) -->
      <div class="modal fade" id="deleteModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content rounded-4 border-0 shadow">
            <div class="modal-header border-bottom">
              <h5 class="modal-title text-danger font-serif fw-bold"><i class="bi bi-trash text-danger me-1"></i> Delete Appointment Record</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p class="mb-2">Are you sure you want to permanently delete booking <code id="deleteTargetRef"></code> for <strong id="deleteTargetName"></strong>?</p>
              <div class="alert alert-warning small mb-0 py-2">
                ⚠️ This will permanently remove the record from both customer lookup and staff reporting.
              </div>
            </div>
            <div class="modal-footer border-top">
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-sm btn-danger rounded-pill px-4 fw-bold" onclick="confirmDeleteBooking()">Delete Permanently</button>
            </div>
          </div>
        </div>
      </div>
    <?php endif; ?>

  </div>
</div>

<?php require_once __DIR__ . '/footer.php'; ?>
