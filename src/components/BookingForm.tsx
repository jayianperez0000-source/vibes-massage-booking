import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Sparkles,
  Check,
  AlertCircle,
  Heart,
  Droplet,
  Feather,
  Info,
} from 'lucide-react';
import type { Service, Therapist, TimeSlot, Booking } from '../types.ts';

interface BookingFormProps {
  onBookingSuccess: (booking: Booking) => void;
  preselectedTherapistId?: number | null;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onBookingSuccess,
  preselectedTherapistId,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('whole-body');
  const [oilOption, setOilOption] = useState<'With Oil' | 'Dry'>('With Oil');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(
    preselectedTherapistId ? String(preselectedTherapistId) : '0'
  );

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [customerName, setCustomerName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Slots State
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Form Submission & Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch initial services & therapists
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [servicesRes, therapistsRes] = await Promise.all([
          fetch('/api/services').then(r => r.json()),
          fetch('/api/therapists').then(r => r.json()),
        ]);

        if (servicesRes.success) setServices(servicesRes.services);
        if (therapistsRes.success) setTherapists(therapistsRes.therapists);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  // Update therapist if preselected
  useEffect(() => {
    if (preselectedTherapistId) {
      setSelectedTherapistId(String(preselectedTherapistId));
    }
  }, [preselectedTherapistId]);

  // Fetch available slots whenever date, service, or therapist changes
  useEffect(() => {
    if (!selectedDate || !selectedServiceId) return;

    let isMounted = true;
    async function fetchSlots() {
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(''); // Reset slot selection when criteria changes

      try {
        const queryParams = new URLSearchParams({
          date: selectedDate,
          service_id: selectedServiceId,
          therapist_id: selectedTherapistId,
        });

        const res = await fetch(`/api/availability?${queryParams.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success) {
            setSlots(data.slots || []);
          } else {
            setSlotsError(data.error || 'Unable to load slots for this date.');
            setSlots([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setSlotsError('Network error checking availability. Please try again.');
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedServiceId, selectedTherapistId]);

  // Client-side instant validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors.name = 'Full name is required.';
    } else if (customerName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    const cleanPhone = contactNumber.replace(/[\s-]/g, '');
    if (!cleanPhone) {
      errors.contact = 'Contact number is required.';
    } else if (!/^(\+?63|0)9\d{9}$/.test(cleanPhone) && cleanPhone.length < 8) {
      errors.contact = 'Please enter a valid phone number (e.g., 09171234567 or +639171234567).';
    }

    if (!selectedDate) {
      errors.date = 'Appointment date is required.';
    } else if (selectedDate < getTodayString()) {
      errors.date = 'Date cannot be in the past.';
    }

    if (!selectedSlot) {
      errors.slot = 'Please choose an available appointment time slot.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get CSRF Token
      const csrfRes = await fetch('/api/csrf-token');
      const csrfData = await csrfRes.json();

      // 2. Submit booking to server with prepared validation
      const payload = {
        service_id: selectedServiceId,
        oil_option: oilOption,
        therapist_id: selectedTherapistId,
        date: selectedDate,
        start_time: selectedSlot,
        name: customerName.trim(),
        contact_number: contactNumber.trim(),
        notes: notes.trim(),
        csrf_token: csrfData.csrfToken,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onBookingSuccess(data.booking);
      } else {
        setServerError(data.error || 'Slot is no longer available. Please choose another time.');
      }
    } catch (err) {
      setServerError('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedTherapist = therapists.find((t) => t.id === Number(selectedTherapistId));

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading Vibes Massage booking schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/50 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-emerald-200 uppercase mb-3">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            Vibes Massage • Circle C Mall Branch
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight mb-2">
            Book Your Therapeutic Massage
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            Experience therapeutic relaxation delivered by certified visually impaired therapists.
            Select your preferred treatment, date, and available time slot below.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 10:00 AM – 9:00 PM Daily
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-300" /> Cash or GCash on arrival
            </span>
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> No account required
            </span>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-sm animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to complete appointment</p>
            <p className="text-rose-700 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* Main Booking Form (Layout mapped to Appendix B Fig. 2) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200/80 shadow-lg p-6 sm:p-8 space-y-8">
        {/* Section 1: Service & Treatment Type */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
              Choose Service & Treatment Type
            </h2>
            <span className="text-xs text-stone-500 font-medium">Step 1 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((svc) => {
              const isSelected = selectedServiceId === svc.id;
              return (
                <div
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`cursor-pointer rounded-2xl p-4 sm:p-5 border-2 transition-all duration-200 relative ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-stone-200 hover:border-emerald-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-900 text-base">{svc.name}</h3>
                      <p className="text-xs font-medium text-emerald-700 mt-0.5">
                        {svc.duration_minutes} Minutes Duration
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-stone-900">₱{svc.price_php.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 mt-2.5 leading-relaxed">{svc.description}</p>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <Check className="w-4 h-4 text-emerald-600" /> Selected Service
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Oil or Dry Options */}
          <div className="mt-5 pt-4 border-t border-stone-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Massage Medium / Preference
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setOilOption('With Oil')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  oilOption === 'With Oil'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Droplet className="w-4 h-4" /> With Oil (Soothing)
              </button>
              <button
                type="button"
                onClick={() => setOilOption('Dry')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  oilOption === 'Dry'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Feather className="w-4 h-4" /> Dry (Acupressure)
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Therapist & Date/Time Schedule */}
        <div className="border-t border-stone-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">2</span>
              Therapist & Schedule
            </h2>
            <span className="text-xs text-stone-500 font-medium">Step 2 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Therapist Dropdown */}
            <div>
              <label htmlFor="therapistSelect" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Select Therapist
              </label>
              <div className="relative">
                <select
                  id="therapistSelect"
                  value={selectedTherapistId}
                  onChange={(e) => setSelectedTherapistId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value="0">⭐ No Preference (Any Available Therapist)</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.specialization} ({t.years_exp} yrs)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                {selectedTherapistId === '0'
                  ? 'We will automatically assign an experienced available therapist to balance team schedule.'
                  : selectedTherapist
                  ? `${selectedTherapist.title} • ${selectedTherapist.specialization}`
                  : ''}
              </p>
            </div>

            {/* Date Picker */}
            <div>
              <label htmlFor="appointmentDate" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Appointment Date
              </label>
              <div className="relative">
                <input
                  id="appointmentDate"
                  type="date"
                  min={getTodayString()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
              {validationErrors.date && (
                <p className="text-xs text-rose-600 mt-1">{validationErrors.date}</p>
              )}
            </div>
          </div>

          {/* Dynamic Available Time Slots Grid */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                Available Time Slots (10-minute intervals)
              </label>
              <span className="text-xs text-stone-500">
                {selectedService ? `${selectedService.duration_minutes} min duration` : ''}
              </span>
            </div>

            {loadingSlots ? (
              <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-stone-600">Calculating real-time slot availability for {selectedDate}...</p>
              </div>
            ) : slotsError ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {slotsError}
              </div>
            ) : slots.length === 0 ? (
              <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                <p className="text-sm font-medium text-stone-700">No time slots available for this selection.</p>
                <p className="text-xs text-stone-500 mt-1">
                  Try selecting "No Preference" or choosing a different date.
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1.5 border border-stone-200 rounded-2xl bg-stone-50/60">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`px-2.5 py-2 rounded-xl text-center text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                            : 'bg-white border border-stone-200 text-stone-800 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span className="block font-bold">{slot.time}</span>
                        <span className="block text-[10px] opacity-75">{slot.endTime}</span>
                        {selectedTherapistId === '0' && (
                          <span className="block text-[9px] text-emerald-600 font-normal mt-0.5">
                            {slot.freeTherapistCount} free
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {validationErrors.slot && (
                  <p className="text-xs text-rose-600 mt-1.5">{validationErrors.slot}</p>
                )}
                {selectedSlot && (
                  <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60 flex items-center justify-between">
                    <span>
                      Selected Slot: <strong>{selectedSlot}</strong> to <strong>{slots.find(s => s.time === selectedSlot)?.endTime}</strong>
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {selectedService?.duration_minutes} Mins
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Customer Information */}
        <div className="border-t border-stone-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">3</span>
              Customer Details (No Registration Needed)
            </h2>
            <span className="text-xs text-stone-500 font-medium">Step 3 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerName" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="customerName"
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full bg-stone-50 border rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    validationErrors.name ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
              </div>
              {validationErrors.name && (
                <p className="text-xs text-rose-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="contactNumber" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Contact Number *
              </label>
              <div className="relative">
                <input
                  id="contactNumber"
                  type="tel"
                  placeholder="e.g. 09171234567"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={`w-full bg-stone-50 border rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    validationErrors.contact ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Used to verify and manage your appointment later.
              </p>
              {validationErrors.contact && (
                <p className="text-xs text-rose-600 mt-1">{validationErrors.contact}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="appointmentNotes" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Special Requests or Focus Areas (Optional)
              </label>
              <textarea
                id="appointmentNotes"
                rows={2}
                placeholder="e.g. Medium pressure, please focus on shoulder tightness and lower back tension"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Total & Submit Button */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-stone-500">Estimated Total on Arrival:</div>
            <div className="text-2xl font-bold text-stone-900">
              ₱{selectedService ? selectedService.price_php.toFixed(2) : '0.00'}
            </div>
            <div className="text-[11px] text-stone-500">
              Payment via Cash or GCash at Vibes Massage front desk
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirming Appointment...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Book Now
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
