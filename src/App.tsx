/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Users,
  ShieldCheck,
  Lock,
  Heart,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { BookingForm } from './components/BookingForm.tsx';
import { BookingConfirmation } from './components/BookingConfirmation.tsx';
import { ManageBooking } from './components/ManageBooking.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { TherapistsList } from './components/TherapistsList.tsx';
import { SecurityAuditView } from './components/SecurityAuditView.tsx';
import type { Booking } from './types.ts';

type ActiveTab = 'book' | 'manage' | 'therapists' | 'staff' | 'security';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('book');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [lookupInitialRef, setLookupInitialRef] = useState<string>('');
  const [lookupInitialContact, setLookupInitialContact] = useState<string>('');
  const [preselectedTherapistId, setPreselectedTherapistId] = useState<number | null>(null);

  const handleBookingSuccess = (booking: Booking) => {
    setConfirmedBooking(booking);
  };

  const handleDoneConfirmation = () => {
    setConfirmedBooking(null);
    setActiveTab('book');
  };

  const handleManageFromConfirmation = () => {
    if (confirmedBooking) {
      setLookupInitialRef(confirmedBooking.reference_no);
      setLookupInitialContact(confirmedBooking.contact_number);
    }
    setConfirmedBooking(null);
    setActiveTab('manage');
  };

  const handleSelectTherapistFromList = (therapistId: number) => {
    setPreselectedTherapistId(therapistId);
    setConfirmedBooking(null);
    setActiveTab('book');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* Top Banner - Social Mission & Branch Details */}
      <div className="bg-emerald-900 text-emerald-100 text-[11px] sm:text-xs py-2 px-4 text-center border-b border-emerald-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>
              <strong>Vibes Massage</strong> • Circle C Mall, Quezon City Branch • Proudly employing licensed visually impaired therapists
            </span>
          </div>
          <div className="flex items-center gap-4 text-emerald-200 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-300" /> 10:00 AM – 9:00 PM Daily
            </span>
            <span className="hidden md:inline text-emerald-300/80">|</span>
            <span className="hidden md:inline">Cash & GCash on arrival</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Logo / Brand */}
          <div
            onClick={() => {
              setConfirmedBooking(null);
              setActiveTab('book');
            }}
            className="cursor-pointer flex items-center gap-3 select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-xl tracking-tight text-stone-900">
                  Vibes Massage
                </span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                  Circle C Mall
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Secure Web-Based Booking System
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('book');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'book' && !confirmedBooking
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Book</span>
              <span className="hidden sm:inline">Appointment</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('manage');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'manage'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden xs:inline">Manage</span>
              <span className="hidden sm:inline">Booking</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('therapists');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'therapists'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">Our Therapists</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('security');
              }}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'security'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
              title="View Security Controls & Audit"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden lg:inline">Security</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('staff');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ml-1 ${
                activeTab === 'staff'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {confirmedBooking ? (
          <BookingConfirmation
            booking={confirmedBooking}
            onDone={handleDoneConfirmation}
            onManage={handleManageFromConfirmation}
          />
        ) : activeTab === 'book' ? (
          <BookingForm
            onBookingSuccess={handleBookingSuccess}
            preselectedTherapistId={preselectedTherapistId}
          />
        ) : activeTab === 'manage' ? (
          <ManageBooking
            initialRef={lookupInitialRef}
            initialContact={lookupInitialContact}
            onBookNew={() => setActiveTab('book')}
          />
        ) : activeTab === 'therapists' ? (
          <TherapistsList onSelectTherapist={handleSelectTherapistFromList} />
        ) : activeTab === 'staff' ? (
          <StaffDashboard />
        ) : activeTab === 'security' ? (
          <SecurityAuditView />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
            {/* Branch Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-serif font-bold text-base">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Vibes Massage — Circle C Mall Branch
              </div>
              <p className="text-stone-400 leading-relaxed">
                Circle C Mall, Congressional Ave, Project 8, Quezon City, Metro Manila, Philippines.
              </p>
              <p className="text-stone-400">
                Operating Hours: 10:00 AM – 9:00 PM Daily (Mondays through Sundays).
              </p>
              <p className="text-emerald-400 font-semibold pt-1">
                Authorized Client Representative: Ms. Gelyn Perez (Branch Manager)
              </p>
            </div>

            {/* Services & Payments */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-stone-200 block">
                Services & Payment Terms
              </span>
              <ul className="space-y-1 text-stone-400">
                <li>• Whole Body Massage (60 mins) — ₱350.00 (With Oil or Dry)</li>
                <li>• Body Parts Massage (30 mins) — ₱200.00 (Targeted Relief)</li>
                <li>• Payment: Cash or GCash upon physical arrival at front desk</li>
                <li>• No credit card or online payment required</li>
              </ul>
            </div>

            {/* Security & Privacy Standards */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-stone-200 block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Privacy & Data Security Standards
              </span>
              <p className="text-stone-400 leading-relaxed">
                Customer privacy is protected with zero mandatory registration. Bookings are identified via reference number & verified contact number.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-emerald-400">
                <span className="bg-stone-800 px-2 py-0.5 rounded border border-stone-700">Prepared Statements</span>
                <span className="bg-stone-800 px-2 py-0.5 rounded border border-stone-700">Rate Limiting</span>
                <span className="bg-stone-800 px-2 py-0.5 rounded border border-stone-700">XXE Protection</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-800 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-3">
            <div>
              © 2026 Vibes Massage Circle C Mall Branch • BSIT Capstone System
            </div>
            <div className="flex items-center gap-4">
              <span>Developers: Jay-Ian G. Perez, Danica Y. Garcia, Lizyl G. Lanugan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
