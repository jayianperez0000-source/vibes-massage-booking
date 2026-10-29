<?php
require_once __DIR__ . '/header.php';
?>

<div class="row justify-content-center">
  <div class="col-lg-8">

    <!-- Manage Booking Lookup Card (Appendix B Wireframe) -->
    <div class="card card-custom p-4 p-md-5 mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <h1 class="h4 fw-bold font-serif mb-1">Manage My Booking</h1>
          <p class="text-muted small mb-0">Look up, reschedule, or cancel your appointment using your reference number.</p>
        </div>
        <span class="badge bg-light text-secondary border px-3 py-2 rounded-pill small">
          <i class="bi bi-shield-lock me-1"></i> No password required
        </span>
      </div>

      <div id="lookupAlert" class="alert alert-danger d-none" role="alert"></div>

      <form id="lookupForm" class="row g-3">
        <div class="col-md-6">
          <label for="inputRef" class="form-label small fw-bold text-uppercase text-secondary">Reference Number</label>
          <input type="text" class="form-control font-monospace" id="inputRef" placeholder="e.g. VM-20261028-001" required>
        </div>
        <div class="col-md-6">
          <label for="inputContact" class="form-label small fw-bold text-uppercase text-secondary">Contact Number</label>
          <input type="tel" class="form-control" id="inputContact" placeholder="e.g. 09171234567" required>
        </div>
        <div class="col-12 text-end">
          <button type="submit" id="btnLookup" class="btn btn-emerald px-4 rounded-pill fw-bold">
            <i class="bi bi-search me-1"></i> Find Booking
          </button>
        </div>
      </form>
    </div>

    <!-- Booking Details Result Card (Hidden until found) -->
    <div id="bookingResultCard" class="card card-custom p-4 p-md-5 d-none mb-4">
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <span class="text-muted small text-uppercase">Reference Number</span>
          <h2 class="h4 fw-bold font-monospace mb-0" id="resRef">VM-20261028-001</h2>
        </div>
        <span id="resStatusBadge" class="badge fs-6 px-3 py-2 rounded-pill">Confirmed</span>
      </div>

      <div class="row g-3 mb-4 small">
        <div class="col-sm-6 p-3 bg-light rounded-3 border">
          <span class="text-muted d-block">Service & Medium</span>
          <strong class="fs-6" id="resService">Whole Body Massage</strong>
          <div class="text-success mt-1" id="resMedium">With Oil • 60 Mins</div>
        </div>

        <div class="col-sm-6 p-3 bg-light rounded-3 border">
          <span class="text-muted d-block">Appointment Schedule</span>
          <strong class="fs-6" id="resSchedule">2026-10-28</strong>
          <div class="text-muted mt-1" id="resTime">11:00 - 12:00</div>
        </div>

        <div class="col-sm-6 p-3 bg-light rounded-3 border">
          <span class="text-muted d-block">Therapist</span>
          <strong class="fs-6" id="resTherapist">Eduardo "Kuya Ed" Ramos</strong>
          <div class="text-muted mt-1">Circle C Mall Branch</div>
        </div>

        <div class="col-sm-6 p-3 bg-light rounded-3 border">
          <span class="text-muted d-block">Customer Details</span>
          <strong class="fs-6" id="resCustomer">Juan Dela Cruz</strong>
          <div class="text-muted mt-1" id="resPhone">09171234567</div>
        </div>
      </div>

      <!-- Action Buttons matching wireframe -->
      <div class="d-flex gap-2 justify-content-end" id="actionBtnContainer">
        <button type="button" class="btn btn-outline-success rounded-pill px-4" id="btnShowReschedule">
          <i class="bi bi-calendar-event me-1"></i> Reschedule
        </button>
        <button type="button" class="btn btn-outline-danger rounded-pill px-4" id="btnShowCancel">
          <i class="bi bi-x-circle me-1"></i> Cancel Booking
        </button>
      </div>

      <!-- In-Place Reschedule Panel -->
      <div id="reschedulePanel" class="mt-4 p-4 rounded-3 border border-success bg-light d-none">
        <h5 class="fw-bold text-success mb-3"><i class="bi bi-clock-history me-1"></i> Select New Schedule</h5>
        <div id="rescheduleAlert" class="alert alert-danger d-none" role="alert"></div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">New Date</label>
            <input type="date" class="form-control" id="rescheduleDate" min="<?= date('Y-m-d') ?>" value="<?= date('Y-m-d') ?>">
          </div>
        </div>

        <label class="form-label small fw-bold">Select New Time Slot</label>
        <div id="rescheduleSlots" class="d-flex flex-wrap gap-2 p-3 bg-white rounded-3 border mb-3" style="max-height: 180px; overflow-y: auto;">
          <span class="text-muted small">Loading available slots...</span>
        </div>
        <input type="hidden" id="newSelectedSlot">

        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" onclick="document.getElementById('reschedulePanel').classList.add('d-none')">
            Close
          </button>
          <button type="button" class="btn btn-sm btn-success rounded-pill px-4 fw-bold" id="btnConfirmReschedule">
            Confirm Reschedule
          </button>
        </div>
      </div>

      <!-- Cancel Confirmation Modal -->
      <div id="cancelPanel" class="mt-4 p-4 rounded-3 border border-danger bg-light d-none">
        <h5 class="fw-bold text-danger mb-2"><i class="bi bi-exclamation-triangle me-1"></i> Are you sure you want to cancel?</h5>
        <p class="text-muted small mb-3">
          This will change your booking status to Cancelled. Your appointment record is retained in the database for staff history.
        </p>
        <div class="mb-3">
          <label class="form-label small fw-bold">Cancellation Reason (Optional)</label>
          <input type="text" class="form-control" id="cancelReason" placeholder="e.g. Schedule conflict, feeling unwell">
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" onclick="document.getElementById('cancelPanel').classList.add('d-none')">
            Keep Booking
          </button>
          <button type="button" class="btn btn-sm btn-danger rounded-pill px-4 fw-bold" id="btnConfirmCancel">
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>

  </div>
</div>

<script>
let activeBooking = null;

document.getElementById('lookupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById('lookupAlert');
  alertBox.classList.add('d-none');

  const ref = document.getElementById('inputRef').value.trim();
  const contact = document.getElementById('inputContact').value.trim();

  const btn = document.getElementById('btnLookup');
  btn.disabled = true;
  btn.textContent = 'Searching...';

  try {
    const res = await fetch('api/manage_booking.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lookup', reference_no: ref, contact_number: contact })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      activeBooking = data.booking;
      renderBooking(data.booking);
    } else {
      alertBox.textContent = data.error || "We couldn't find a booking with those details.";
      if (data.attempts_left !== undefined) {
        alertBox.textContent += ` (Attempts left before security lock: ${data.attempts_left})`;
      }
      alertBox.classList.remove('d-none');
      document.getElementById('bookingResultCard').classList.add('d-none');
    }
  } catch (err) {
    alertBox.textContent = 'Network communication error.';
    alertBox.classList.remove('d-none');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-search me-1"></i> Find Booking';
  }
});

function renderBooking(b) {
  document.getElementById('resRef').textContent = b.reference_no;
  document.getElementById('resService').textContent = b.service_name;
  document.getElementById('resMedium').textContent = `${b.oil_option} • ${b.duration_minutes} Mins`;
  document.getElementById('resSchedule').textContent = b.booking_date;
  document.getElementById('resTime').textContent = `${b.start_time} - ${b.end_time}`;
  document.getElementById('resTherapist').textContent = b.therapist_name;
  document.getElementById('resCustomer').textContent = b.customer_name;
  document.getElementById('resPhone').textContent = b.contact_number;

  const badge = document.getElementById('resStatusBadge');
  badge.textContent = b.status;
  badge.className = 'badge fs-6 px-3 py-2 rounded-pill ' + 
    (b.status === 'Confirmed' ? 'bg-success' : b.status === 'Pending' ? 'bg-warning text-dark' : b.status === 'Completed' ? 'bg-info text-dark' : 'bg-danger');

  if (b.status === 'Cancelled' || b.status === 'Completed') {
    document.getElementById('actionBtnContainer').classList.add('d-none');
  } else {
    document.getElementById('actionBtnContainer').classList.remove('d-none');
  }

  document.getElementById('bookingResultCard').classList.remove('d-none');
  document.getElementById('reschedulePanel').classList.add('d-none');
  document.getElementById('cancelPanel').classList.add('d-none');
}

// Reschedule button triggers slot loading
document.getElementById('btnShowReschedule').addEventListener('click', () => {
  document.getElementById('reschedulePanel').classList.toggle('d-none');
  document.getElementById('cancelPanel').classList.add('d-none');
  loadRescheduleSlots();
});

document.getElementById('rescheduleDate').addEventListener('change', loadRescheduleSlots);

function loadRescheduleSlots() {
  if (!activeBooking) return;
  const date = document.getElementById('rescheduleDate').value;
  const container = document.getElementById('rescheduleSlots');
  container.innerHTML = '<span class="text-muted small">Loading slots...</span>';

  fetch(`api/check_availability.php?date=${date}&service_id=${activeBooking.service_id}&therapist_id=${activeBooking.therapist_id}`)
    .then(r => r.json())
    .then(data => {
      container.innerHTML = '';
      if (data.success && data.slots && data.slots.length > 0) {
        data.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-outline-dark btn-sm rounded-2';
          btn.textContent = slot.time;
          btn.onclick = () => {
            container.querySelectorAll('button').forEach(b => b.classList.remove('btn-success', 'text-white'));
            btn.classList.add('btn-success', 'text-white');
            document.getElementById('newSelectedSlot').value = slot.time;
          };
          container.appendChild(btn);
        });
      } else {
        container.innerHTML = '<span class="text-danger small">No available slots for this date.</span>';
      }
    });
}

document.getElementById('btnConfirmReschedule').addEventListener('click', async () => {
  const newDate = document.getElementById('rescheduleDate').value;
  const newTime = document.getElementById('newSelectedSlot').value;
  const alertBox = document.getElementById('rescheduleAlert');
  alertBox.classList.add('d-none');

  if (!newTime) {
    alertBox.textContent = 'Please choose a new time slot.';
    alertBox.classList.remove('d-none');
    return;
  }

  const res = await fetch('api/manage_booking.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'reschedule',
      reference_no: activeBooking.reference_no,
      contact_number: activeBooking.contact_number,
      new_date: newDate,
      new_time: newTime
    })
  });
  const data = await res.json();
  if (res.ok && data.success) {
    alert('Appointment rescheduled successfully!');
    location.reload();
  } else {
    alertBox.textContent = data.error || 'Failed to reschedule.';
    alertBox.classList.remove('d-none');
  }
});

// Cancel Flow
document.getElementById('btnShowCancel').addEventListener('click', () => {
  document.getElementById('cancelPanel').classList.toggle('d-none');
  document.getElementById('reschedulePanel').classList.add('d-none');
});

document.getElementById('btnConfirmCancel').addEventListener('click', async () => {
  const reason = document.getElementById('cancelReason').value;
  const res = await fetch('api/manage_booking.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'cancel',
      reference_no: activeBooking.reference_no,
      contact_number: activeBooking.contact_number,
      reason: reason
    })
  });
  const data = await res.json();
  if (res.ok && data.success) {
    alert('Booking has been cancelled.');
    location.reload();
  } else {
    alert(data.error || 'Could not cancel booking.');
  }
});
</script>

<?php require_once __DIR__ . '/footer.php'; ?>
