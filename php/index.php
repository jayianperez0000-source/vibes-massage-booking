<?php
require_once __DIR__ . '/header.php';
?>

<div class="row justify-content-center">
  <div class="col-lg-9">

    <!-- Intro Card -->
    <div class="p-4 p-md-5 mb-4 rounded-4 text-white shadow" style="background: linear-gradient(135deg, #065f46 0%, #115e59 100%);">
      <span class="badge bg-white text-success px-3 py-1 mb-2 rounded-pill small">
        <i class="bi bi-heart-fill text-danger me-1"></i> Circle C Mall, Quezon City Branch
      </span>
      <h1 class="display-6 fw-bold mb-2 font-serif">Book Your Therapeutic Massage</h1>
      <p class="lead mb-3 fs-6 opacity-90">
        Professional massage therapy delivered by licensed visually impaired specialists. Select your service, preferred therapist, and available time slot below.
      </p>
      <div class="d-flex flex-wrap gap-3 small opacity-75">
        <span><i class="bi bi-clock me-1"></i> 10:00 AM – 9:00 PM Daily</span>
        <span><i class="bi bi-cash-coin me-1"></i> Pay upon arrival (Cash or GCash)</span>
        <span><i class="bi bi-shield-check me-1"></i> No account required</span>
      </div>
    </div>

    <!-- Confirmation Screen Container (Hidden by default, shown upon successful booking) -->
    <div id="confirmationScreen" class="card card-custom p-4 p-md-5 text-center mb-4 d-none">
      <div class="mb-3">
        <div class="rounded-circle bg-success text-white d-inline-flex align-items-center justify-center shadow" style="width: 70px; height: 70px;">
          <i class="bi bi-check-lg fs-1"></i>
        </div>
      </div>
      <h2 class="h3 fw-bold text-dark mb-1">Booking Confirmed</h2>
      <p class="text-muted small">Your appointment has been registered in the database.</p>

      <!-- Reference Box matching Appendix B wireframe -->
      <div class="my-4 p-4 rounded-3 border border-2 border-dashed border-success bg-light text-center">
        <span class="text-uppercase tracking-wider fw-bold text-success small d-block">Your Reference Number</span>
        <div class="display-6 font-monospace fw-bold text-dark my-2" id="confirmRefNo">VM-20261028-001</div>
        <button type="button" class="btn btn-sm btn-outline-success rounded-pill px-3 mt-1" id="btnCopyRef">
          <i class="bi bi-clipboard me-1"></i> Copy Reference Number
        </button>
        <p class="text-danger fw-bold small mt-3 mb-0">
          ⚠️ Save this number to manage your booking later
        </p>
      </div>

      <!-- Booking Summary Details -->
      <div class="bg-light p-3 rounded-3 text-start mb-4 border small" id="confirmDetails">
        <!-- populated via js -->
      </div>

      <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
        <button type="button" class="btn btn-emerald px-4 py-2 rounded-pill fw-bold" onclick="location.reload();">
          Done (Make Another Booking)
        </button>
        <button type="button" class="btn btn-outline-secondary px-4 py-2 rounded-pill" onclick="window.print();">
          <i class="bi bi-printer me-1"></i> Print / Save Voucher
        </button>
        <a href="manage.php" class="btn btn-outline-success px-4 py-2 rounded-pill">
          Manage This Booking <i class="bi bi-arrow-right ms-1"></i>
        </a>
      </div>
    </div>

    <!-- Booking Form Card (Appendix B Wireframe) -->
    <div id="bookingFormContainer" class="card card-custom p-4 p-md-5">
      <div id="alertBox" class="alert alert-danger d-none" role="alert"></div>

      <form id="bookingForm">
        <input type="hidden" name="csrf_token" value="<?= safe_output($csrf_token) ?>">

        <!-- Step 1: Service Type -->
        <div class="mb-4">
          <label class="form-label fw-bold text-uppercase small text-secondary">1. Choose Service & Medium</label>
          <div class="row g-3">
            <div class="col-md-6">
              <div class="form-check card p-3 border-2 service-card h-100 cursor-pointer" onclick="selectService('whole-body')">
                <input class="form-check-input" type="radio" name="service_id" id="svcWholeBody" value="whole-body" checked>
                <label class="form-check-label w-100" for="svcWholeBody">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="fs-6">Whole Body Massage</strong>
                    <span class="badge bg-success fs-6">₱350.00</span>
                  </div>
                  <small class="text-muted d-block">60 Minutes Duration • Complete physical tension release</small>
                </label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check card p-3 border-2 service-card h-100 cursor-pointer" onclick="selectService('body-parts')">
                <input class="form-check-input" type="radio" name="service_id" id="svcBodyParts" value="body-parts">
                <label class="form-check-label w-100" for="svcBodyParts">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="fs-6">Body Parts Massage</strong>
                    <span class="badge bg-success fs-6">₱200.00</span>
                  </div>
                  <small class="text-muted d-block">30 Minutes Duration • Targeted back, shoulders, or legs</small>
                </label>
              </div>
            </div>
          </div>

          <div class="mt-3">
            <label class="form-label small fw-bold text-secondary">Medium Preference</label>
            <div class="btn-group w-100 max-w-sm" role="group">
              <input type="radio" class="btn-check" name="oil_option" id="oilWith" value="With Oil" checked>
              <label class="btn btn-outline-success" for="oilWith"><i class="bi bi-droplet-fill me-1"></i> With Oil</label>

              <input type="radio" class="btn-check" name="oil_option" id="oilDry" value="Dry">
              <label class="btn btn-outline-success" for="oilDry"><i class="bi bi-feather me-1"></i> Dry (Acupressure)</label>
            </div>
          </div>
        </div>

        <hr class="my-4">

        <!-- Step 2: Therapist and Date/Time -->
        <div class="mb-4">
          <label class="form-label fw-bold text-uppercase small text-secondary">2. Therapist & Schedule</label>
          <div class="row g-3">
            <div class="col-md-6">
              <label for="therapistSelect" class="form-label small fw-bold">Therapist Preference</label>
              <select class="form-select" id="therapistSelect" name="therapist_id">
                <option value="0">⭐ No Preference (Auto-assign available therapist)</option>
              </select>
              <div class="form-text small" style="font-size: 11px;">Select "No Preference" for maximum slot availability.</div>
            </div>

            <div class="col-md-6">
              <label for="bookingDate" class="form-label small fw-bold">Date</label>
              <input type="date" class="form-control" id="bookingDate" name="date" min="<?= date('Y-m-d') ?>" value="<?= date('Y-m-d') ?>" required>
            </div>
          </div>

          <!-- Time Slots Grid -->
          <div class="mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label small fw-bold mb-0">Available Time Slots (10-minute intervals)</label>
              <span id="slotStatus" class="small text-muted"></span>
            </div>

            <div id="slotsContainer" class="d-flex flex-wrap gap-2 p-3 bg-light rounded-3 border" style="max-height: 220px; overflow-y: auto;">
              <span class="text-muted small">Loading available slots...</span>
            </div>
            <input type="hidden" name="start_time" id="selectedStartTime" required>
          </div>
        </div>

        <hr class="my-4">

        <!-- Step 3: Customer Information -->
        <div class="mb-4">
          <label class="form-label fw-bold text-uppercase small text-secondary">3. Customer Information</label>
          <div class="row g-3">
            <div class="col-md-6">
              <label for="custName" class="form-label small fw-bold">Full Name *</label>
              <input type="text" class="form-control" id="custName" name="name" placeholder="e.g. Maria Santos" required minlength="2">
            </div>

            <div class="col-md-6">
              <label for="custContact" class="form-label small fw-bold">Contact Number *</label>
              <input type="tel" class="form-control" id="custContact" name="contact_number" placeholder="e.g. 09171234567" required>
              <div class="form-text small" style="font-size: 11px;">Used with your reference number to manage your appointment.</div>
            </div>

            <div class="col-12">
              <label for="custNotes" class="form-label small fw-bold">Special Requests or Focus Areas (Optional)</label>
              <textarea class="form-control" id="custNotes" name="notes" rows="2" placeholder="e.g. Focus on lower back and neck tension, medium pressure"></textarea>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center pt-3 border-top gap-3">
          <div>
            <span class="text-muted small d-block">Estimated Total Due on Arrival:</span>
            <span class="fs-4 fw-bold text-dark" id="displayTotal">₱350.00</span>
          </div>

          <button type="submit" id="btnBookNow" class="btn btn-emerald btn-lg px-5 rounded-pill fw-bold shadow">
            Book Now <i class="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      </form>
    </div>

  </div>
</div>

<script>
let currentServiceId = 'whole-body';

function selectService(svcId) {
  currentServiceId = svcId;
  document.getElementById(svcId === 'whole-body' ? 'svcWholeBody' : 'svcBodyParts').checked = true;
  document.getElementById('displayTotal').textContent = (svcId === 'whole-body') ? '₱350.00' : '₱200.00';
  loadSlots();
}

// Load therapists on page ready
document.addEventListener('DOMContentLoaded', () => {
  fetch('api/get_therapists.php')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.therapists) {
        const select = document.getElementById('therapistSelect');
        data.therapists.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = `${t.name} — ${t.specialization} (${t.years_exp} yrs)`;
          select.appendChild(opt);
        });
      }
    })
    .catch(err => console.error('Failed to load therapists', err));

  loadSlots();

  document.getElementById('therapistSelect').addEventListener('change', loadSlots);
  document.getElementById('bookingDate').addEventListener('change', loadSlots);

  // Booking Form Submission
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('alertBox');
    alertBox.classList.add('d-none');

    const startTime = document.getElementById('selectedStartTime').value;
    if (!startTime) {
      alertBox.textContent = 'Please select an available time slot from the list.';
      alertBox.classList.remove('d-none');
      return;
    }

    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const btn = document.getElementById('btnBookNow');
    btn.disabled = true;
    btn.textContent = 'Confirming Booking...';

    try {
      const res = await fetch('api/create_booking.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showConfirmation(data.booking);
      } else {
        alertBox.textContent = data.error || 'This slot is no longer available. Please select another time.';
        alertBox.classList.remove('d-none');
        loadSlots();
      }
    } catch (err) {
      alertBox.textContent = 'Network communication error. Please try again.';
      alertBox.classList.remove('d-none');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Book Now';
    }
  });

  // Copy Reference Button
  document.getElementById('btnCopyRef').addEventListener('click', () => {
    const ref = document.getElementById('confirmRefNo').textContent;
    navigator.clipboard.writeText(ref);
    const btn = document.getElementById('btnCopyRef');
    btn.innerHTML = '<i class="bi bi-check2 me-1"></i> Copied!';
    setTimeout(() => {
      btn.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy Reference Number';
    }, 2000);
  });
});

function loadSlots() {
  const date = document.getElementById('bookingDate').value;
  const therapistId = document.getElementById('therapistSelect').value;
  const container = document.getElementById('slotsContainer');
  const statusEl = document.getElementById('slotStatus');
  document.getElementById('selectedStartTime').value = '';

  container.innerHTML = '<span class="text-muted small">Checking availability...</span>';

  fetch(`api/check_availability.php?date=${date}&service_id=${currentServiceId}&therapist_id=${therapistId}`)
    .then(r => r.json())
    .then(data => {
      if (data.success && data.slots && data.slots.length > 0) {
        container.innerHTML = '';
        statusEl.textContent = `${data.totalSlots} slots available`;

        data.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-outline-dark btn-sm slot-btn rounded-2';
          btn.innerHTML = `<strong>${slot.time}</strong><small class="d-block text-muted" style="font-size:10px;">${slot.endTime}</small>`;
          btn.onclick = () => {
            document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('btn-success', 'text-white'));
            btn.classList.add('btn-success', 'text-white');
            document.getElementById('selectedStartTime').value = slot.time;
          };
          container.appendChild(btn);
        });
      } else {
        container.innerHTML = '<span class="text-danger small">No slots available for this date/therapist. Try "No Preference" or another date.</span>';
        statusEl.textContent = '0 slots';
      }
    })
    .catch(() => {
      container.innerHTML = '<span class="text-danger small">Could not load slots. Ensure XAMPP MySQL is running.</span>';
    });
}

function showConfirmation(b) {
  document.getElementById('bookingFormContainer').classList.add('d-none');
  document.getElementById('confirmRefNo').textContent = b.reference_no;

  document.getElementById('confirmDetails').innerHTML = `
    <div class="row g-2">
      <div class="col-6"><strong>Service:</strong> ${b.service_name} (${b.oil_option})</div>
      <div class="col-6"><strong>Duration:</strong> ${b.duration_minutes} Minutes</div>
      <div class="col-6"><strong>Date:</strong> ${b.booking_date}</div>
      <div class="col-6"><strong>Time:</strong> ${b.start_time} - ${b.end_time}</div>
      <div class="col-6"><strong>Therapist:</strong> ${b.therapist_name}</div>
      <div class="col-6"><strong>Customer:</strong> ${b.customer_name} (${b.contact_number})</div>
      <div class="col-12 mt-2 pt-2 border-top"><strong>Branch:</strong> Circle C Mall, Quezon City • <strong>Payment:</strong> Cash or GCash on arrival</div>
    </div>
  `;

  document.getElementById('confirmationScreen').classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
