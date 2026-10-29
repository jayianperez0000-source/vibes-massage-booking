import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Calendar,
  Clock,
  User,
  Phone,
  Sparkles,
  MapPin,
  ArrowRight,
  Printer,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { Booking } from '../types.ts';

interface BookingConfirmationProps {
  booking: Booking;
  onDone: () => void;
  onManage: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  booking,
  onDone,
  onManage,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(booking.reference_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto py-4">
      {/* Visual Container matching Appendix B Wireframe */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden p-6 sm:p-10 text-center">
        {/* Animated Check Icon */}
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          Booking Confirmed
        </h1>
        <p className="text-sm text-stone-500 mt-1">Your appointment has been registered in the system.</p>

        {/* Reference Number Box */}
        <div className="mt-6 p-5 bg-gradient-to-br from-stone-50 to-emerald-50/40 rounded-2xl border-2 border-dashed border-emerald-300">
          <span className="text-xs uppercase tracking-widest font-bold text-emerald-800">
            Your Reference Number
          </span>
          <div className="flex items-center justify-center gap-3 mt-1.5">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-stone-900 tracking-wider">
              {booking.reference_no}
            </span>
            <button
              onClick={handleCopy}
              title="Copy Reference Number"
              className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-emerald-50 hover:border-emerald-300 text-stone-700 transition-all shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-600" />}
            </button>
          </div>
          {copied && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-1">Copied to clipboard!</p>
          )}
          <p className="text-xs text-stone-600 mt-2 font-medium">
            ⚠️ <strong>Save this number to manage your booking later</strong>
          </p>
        </div>

        {/* Appointment Details Card */}
        <div className="mt-6 text-left bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200/70 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
            <div>
              <span className="text-xs text-stone-500 block">Service & Medium</span>
              <span className="font-bold text-stone-900 text-sm">{booking.service_name} ({booking.oil_option})</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 block">Duration</span>
              <span className="font-semibold text-emerald-700 text-sm">{booking.duration_minutes} Mins</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-stone-500 block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> Date
              </span>
              <span className="font-semibold text-stone-900">{booking.booking_date}</span>
            </div>
            <div>
              <span className="text-stone-500 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" /> Time Window
              </span>
              <span className="font-semibold text-stone-900">{booking.start_time} - {booking.end_time}</span>
            </div>
            <div>
              <span className="text-stone-500 block flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-stone-400" /> Assigned Therapist
              </span>
              <span className="font-semibold text-stone-900">{booking.therapist_name || 'Assigned Staff'}</span>
            </div>
            <div>
              <span className="text-stone-500 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" /> Branch
              </span>
              <span className="font-semibold text-stone-900">Circle C Mall, QC</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200/60 flex items-center justify-between">
            <span>Customer: {booking.customer_name} ({booking.contact_number})</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
              {booking.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={onDone}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
          >
            Done
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save Voucher
            </button>
            <button
              onClick={onManage}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Manage Booking <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>No password needed • Protected by reference & contact number verification</span>
        </div>
      </div>
    </div>
  );
};
