import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';
import type { Booking, TimeSlot } from '../types.ts';

interface ManageBookingProps {
  initialRef?: string;
  initialContact?: string;
  onBookNew: () => void;
}

export const ManageBooking: React.FC<ManageBookingProps> = ({
  initialRef = '',
  initialContact = '',
  onBookNew,
}) => {
  const [referenceNo, setReferenceNo] = useState(initialRef);
  const [contactNumber, setContactNumber] = useState(initialContact);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [booking, setBooking] = useState<Booking | null>(null);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  // If initial props are passed, trigger search
  useEffect(() => {
    if (initialRef && initialContact) {
      handleLookup();
    }
  }, [initialRef, initialContact]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setRescheduleSuccess(null);
    setCancelSuccess(null);

    const cleanRef = referenceNo.trim().toUpperCase();
    const cleanPhone = contactNumber.trim();

    if (!cleanRef || !cleanPhone) {
      setError('Please provide both your Booking Reference Number and Contact Number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_no: cleanRef,
          contact_number: cleanPhone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBooking(data.booking);
        setError(null);
        setIsLocked(false);
        setAttemptsLeft(5);
        setNewDate(data.booking.booking_date);
      } else {
        setBooking(null);
        setError(data.error || "We couldn't find a booking with those details.");
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        if (data.locked) {
          setIsLocked(true);
        }
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots for rescheduling
  useEffect(() => {
    if (!showReschedule || !booking || !newDate) return;

    let isMounted = true;
    async function fetchRescheduleSlots() {
      setLoadingRescheduleSlots(true);
      setRescheduleError(null);
      setNewSlot('');

      try {
        const queryParams = new URLSearchParams({
          date: newDate,
          service_id: booking?.service_id || 'whole-body',
          therapist_id: String(booking?.therapist_id || '0'),
        });

        const res = await fetch(`/api/availability?${queryParams.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success) {
            setRescheduleSlots(data.slots || []);
          } else {
            setRescheduleError(data.error || 'Failed to check availability.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setRescheduleError('Network error checking time slots.');
        }
      } finally {
        if (isMounted) setLoadingRescheduleSlots(false);
      }
    }

    fetchRescheduleSlots();
    return () => {
      isMounted = false;
    };
  }, [showReschedule, newDate, booking]);

  const handleConfirmReschedule = async () => {
    if (!booking || !newDate || !newSlot) {
      setRescheduleError('Please choose a valid date and available time slot.');
      return;
    }

    setSubmittingReschedule(true);
    setRescheduleError(null);

    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_no: booking.reference_no,
          contact_number: booking.contact_number,
          new_date: newDate,
          new_time: newSlot,
          new_therapist_id: booking.therapist_id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRescheduleSuccess(`Appointment rescheduled successfully to ${newDate} at ${newSlot}!`);
        setShowReschedule(false);
        // Refresh booking details
        handleLookup();
      } else {
        setRescheduleError(data.error || 'Unable to reschedule to this slot.');
      }
    } catch (err) {
      setRescheduleError('Network error during reschedule.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;

    setSubmittingCancel(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_no: booking.reference_no,
          contact_number: booking.contact_number,
          cancellation_reason: cancelReason,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCancelSuccess('Your booking has been cancelled. Your record is preserved for reference.');
        setShowCancelModal(false);
        // Refresh booking details
        handleLookup();
      } else {
        setError(data.error || 'Could not cancel booking.');
      }
    } catch (err) {
      setError('Network error cancelling booking.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Card (Matching Appendix B Wireframe) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              Manage My Booking
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Look up, reschedule, or cancel your appointment using your unique reference number.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-stone-100 rounded-full text-[11px] text-stone-600 font-medium">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            No password required
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Lookup Error</p>
              <p className="mt-0.5">{error}</p>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="mt-1 text-rose-600 font-semibold">
                  Remaining attempts before security lockout: {attemptsLeft}
                </p>
              )}
            </div>
          </div>
        )}

        {isLocked && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-start gap-3 text-xs sm:text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Security Rate Limit Triggered</p>
              <p className="mt-0.5">
                5 consecutive failed attempts were recorded from this IP. To protect customer confidentiality, lookup is temporarily locked for 10 minutes.
              </p>
            </div>
          </div>
        )}

        {rescheduleSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="font-medium">{rescheduleSuccess}</p>
          </div>
        )}

        {cancelSuccess && (
          <div className="mb-6 p-4 bg-stone-100 border border-stone-300 text-stone-800 rounded-2xl flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-stone-600 flex-shrink-0" />
            <p className="font-medium">{cancelSuccess}</p>
          </div>
        )}

        {/* Input Form matching Appendix B wireframe */}
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="refInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Reference Number
              </label>
              <input
                id="refInput"
                type="text"
                placeholder="e.g. VM-20261026-001"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value.toUpperCase())}
                disabled={isLocked || loading}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase transition-all"
              />
            </div>

            <div>
              <label htmlFor="contactInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Contact Number
              </label>
              <input
                id="contactInput"
                type="tel"
                placeholder="e.g. 09171234567"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                disabled={isLocked || loading}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">
              Sample test refs: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-600">VM-20261026-001</code> (09171234567)
            </span>
            <button
              type="submit"
              disabled={loading || isLocked}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-sm transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Booking Record Result Card */}
      {booking && (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg p-6 sm:p-8 animate-fade-in space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Booking Status</span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-xl font-mono font-extrabold text-stone-900">
                  {booking.reference_no}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    booking.status === 'Confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : booking.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800'
                      : booking.status === 'Completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
            </div>

            {/* Quick Actions (Matching Appendix B wireframe) */}
            {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowReschedule(!showReschedule)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {showReschedule ? 'Hide Reschedule' : 'Reschedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Service & Oil</span>
              <span className="font-bold text-stone-900 text-sm">{booking.service_name}</span>
              <span className="block text-emerald-700 font-medium mt-0.5">
                {booking.oil_option} • {booking.duration_minutes} Mins
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Schedule</span>
              <span className="font-bold text-stone-900 text-sm">{booking.booking_date}</span>
              <span className="block text-stone-700 font-medium mt-0.5">
                {booking.start_time} - {booking.end_time}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Therapist</span>
              <span className="font-bold text-stone-900 text-sm">
                {booking.therapist_name || 'Assigned Staff'}
              </span>
              <span className="block text-stone-500 text-[11px] mt-0.5">
                {booking.therapist_title || 'Circle C Mall Branch'}
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Customer Name</span>
              <span className="font-semibold text-stone-900">{booking.customer_name}</span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Contact Phone</span>
              <span className="font-semibold text-stone-900">{booking.contact_number}</span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
              <span className="text-stone-500 block mb-1">Amount Due on Arrival</span>
              <span className="font-bold text-stone-900 text-sm">
                ₱{booking.price_php ? booking.price_php.toFixed(2) : '350.00'}
              </span>
            </div>
          </div>

          {booking.notes && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs">
              <span className="font-semibold text-stone-700 block mb-0.5">Customer Notes:</span>
              <p className="text-stone-600 italic">"{booking.notes}"</p>
            </div>
          )}

          {booking.cancellation_reason && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
              <span className="font-semibold block mb-0.5">Cancellation Reason:</span>
              <p>{booking.cancellation_reason}</p>
            </div>
          )}

          {/* Reschedule In-Place Section */}
          {showReschedule && (
            <div className="mt-4 pt-4 border-t-2 border-dashed border-emerald-200 bg-emerald-50/30 p-5 rounded-2xl">
              <h3 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-700" />
                Select New Date & Time Slot
              </h3>

              {rescheduleError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {rescheduleError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="rescheduleDate" className="block text-xs font-bold text-stone-700 mb-1">
                    New Date
                  </label>
                  <input
                    id="rescheduleDate"
                    type="date"
                    min={getTodayString()}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Therapist
                  </label>
                  <div className="px-3 py-2 bg-stone-100 rounded-xl text-xs text-stone-700 font-medium">
                    {booking.therapist_name}
                  </div>
                </div>
              </div>

              {/* Slots for reschedule */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Available Slots for {newDate}
                </label>
                {loadingRescheduleSlots ? (
                  <p className="text-xs text-stone-500 py-2">Loading slots...</p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-amber-700 py-2">No slots available on this date for this therapist.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-stone-200">
                    {rescheduleSlots.map((slot) => {
                      const isSel = newSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setNewSlot(slot.time)}
                          className={`p-1.5 text-center rounded-lg text-xs font-semibold transition-all ${
                            isSel
                              ? 'bg-emerald-700 text-white shadow-sm'
                              : 'bg-stone-50 text-stone-800 hover:bg-emerald-50'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={!newSlot || submittingReschedule}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm"
                >
                  {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && booking && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-center text-lg font-bold text-stone-900">
              Cancel Appointment?
            </h3>
            <p className="text-center text-xs text-stone-500 mt-1">
              Are you sure you want to cancel booking <strong>{booking.reference_no}</strong> on {booking.booking_date} at {booking.start_time}?
            </p>
            <p className="text-center text-[11px] text-stone-400 mt-1">
              Your record will be marked as cancelled in the database for staff record-keeping.
            </p>

            <div className="mt-4">
              <label htmlFor="cancelReasonInput" className="block text-xs font-bold text-stone-700 mb-1">
                Reason for cancellation (Optional):
              </label>
              <textarea
                id="cancelReasonInput"
                rows={2}
                placeholder="e.g. Schedule conflict, feeling unwell"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submittingCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
