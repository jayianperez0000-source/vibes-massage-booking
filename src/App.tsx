/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Users,
  ShieldCheck,
  Lock,
  Heart,
  Clock,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { BookingForm } from './components/BookingForm.tsx';
import { BookingConfirmation } from './components/BookingConfirmation.tsx';
import { ManageBooking } from './components/ManageBooking.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { TherapistsList } from './components/TherapistsList.tsx';
import { SecurityAuditView } from './components/SecurityAuditView.tsx';
import type { Booking } from './types.ts';

type ClientTab = 'book' | 'manage' | 'therapists';
type AdminTab = 'dashboard' | 'security';

function checkIsAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path.startsWith('/admin') ||
    path.startsWith('/staff') ||
    path.startsWith('/portal') ||
    search.includes('admin') ||
    search.includes('staff') ||
    hash === '#admin' ||
    hash === '#staff'
  );
}

export default function App() {
  const [isAdminView, setIsAdminView] = useState<boolean>(() => checkIsAdminUrl());
  const [clientTab, setClientTab] = useState<ClientTab>('book');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [lookupInitialRef, setLookupInitialRef] = useState<string>('');
  const [lookupInitialContact, setLookupInitialContact] = useState<string>('');
  const [preselectedTherapistId, setPreselectedTherapistId] = useState<number | null>(null);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(checkIsAdminUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdmin = () => {
    setIsAdminView(true);
    setConfirmedBooking(null);
    if (!checkIsAdminUrl()) {
      window.history.pushState({ view: 'admin' }, '', '/admin');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToClient = (tab: ClientTab = 'book') => {
    setIsAdminView(false);
    setClientTab(tab);
    setConfirmedBooking(null);
    if (checkIsAdminUrl()) {
      window.history.pushState({ view: 'client' }, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingSuccess = (booking: Booking) => {
    setConfirmedBooking(booking);
  };

  const handleDoneConfirmation = () => {
    setConfirmedBooking(null);
    setClientTab('book');
  };

  const handleManageFromConfirmation = () => {
    if (confirmedBooking) {
      setLookupInitialRef(confirmedBooking.reference_no);
      setLookupInitialContact(confirmedBooking.contact_number);
    }
    setConfirmedBooking(null);
    setClientTab('manage');
  };

  const handleSelectTherapistFromList = (therapistId: number) => {
    setPreselectedTherapistId(therapistId);
    setConfirmedBooking(null);
    setClientTab('book');
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

      {/* Header Bar */}
      {isAdminView ? (
        /* ========================================================= */
        /* Dedicated Staff & Admin Portal Header                    */
        /* ========================================================= */
        <header className="bg-stone-900 text-white sticky top-0 z-40 border-b border-stone-800 shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
            {/* Admin Brand */}
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-stone-800 to-stone-700 text-white flex items-center justify-center shadow-md border border-stone-700">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-lg sm:text-xl tracking-tight text-white">
                    Vibes Massage
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] uppercase tracking-wider">
                    Staff Portal
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-medium">
                  Authorized Branch Management & Administration
                </p>
              </div>
            </div>

            {/* Admin Navigation & Return to Client Site */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center bg-stone-800/80 rounded-xl p-1 border border-stone-700 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminTab('dashboard')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    adminTab === 'dashboard'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('security')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    adminTab === 'security'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Security Controls
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigateToClient('book')}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white text-stone-900 hover:bg-stone-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-700" />
                <span className="hidden xs:inline">Back to</span> Public Site
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* ========================================================= */
        /* Public Client Navigation Bar (No Admin/Staff buttons)     */
        /* ========================================================= */
        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
            {/* Logo / Brand */}
            <div
              onClick={() => {
                setConfirmedBooking(null);
                setClientTab('book');
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

            {/* Client-Only Navigation Tabs (Staff Portal is strictly excluded) */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  setClientTab('book');
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  clientTab === 'book' && !confirmedBooking
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
                  setClientTab('manage');
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  clientTab === 'manage'
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
                  setClientTab('therapists');
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  clientTab === 'therapists'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Our Therapists</span>
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {isAdminView ? (
          /* Admin View */
          adminTab === 'dashboard' ? (
            <StaffDashboard />
          ) : (
            <SecurityAuditView />
          )
        ) : (
          /* Public Client View */
          confirmedBooking ? (
            <BookingConfirmation
              booking={confirmedBooking}
              onDone={handleDoneConfirmation}
              onManage={handleManageFromConfirmation}
            />
          ) : clientTab === 'book' ? (
            <BookingForm
              onBookingSuccess={handleBookingSuccess}
              preselectedTherapistId={preselectedTherapistId}
            />
          ) : clientTab === 'manage' ? (
            <ManageBooking
              initialRef={lookupInitialRef}
              initialContact={lookupInitialContact}
              onBookNew={() => setClientTab('book')}
            />
          ) : clientTab === 'therapists' ? (
            <TherapistsList onSelectTherapist={handleSelectTherapistFromList} />
          ) : null
        )}
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
              {/* Discreet Staff Portal link for branch staff */}
              <button
                type="button"
                onClick={navigateToAdmin}
                className="text-stone-600 hover:text-stone-400 transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                title="Branch Staff & Administration Access"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Staff Access</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
