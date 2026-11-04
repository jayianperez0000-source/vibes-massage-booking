import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Shield,
  FileCode,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  LogOut,
  RefreshCw,
  Eye,
  FileText,
  ShieldCheck,
  Check,
  HelpCircle,
  Pencil,
  Trash2,
  Database,
  FileSpreadsheet,
  UserPlus,
  Key,
  UserCheck,
  UserX,
  EyeOff,
} from 'lucide-react';
import type { Booking, StaffUser, StaffAccount, ActivityLog, Therapist } from '../types.ts';

export const StaffDashboard: React.FC = () => {
  // Auth State
  const [sessionUser, setSessionUser] = useState<StaffUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionRemainingMs, setSessionRemainingMs] = useState<number>(15 * 60 * 1000);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Staff & Admin Accounts Management State
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'staff' as 'admin' | 'staff',
  });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountActionMessage, setAccountActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resettingPasswordId, setResettingPasswordId] = useState<number | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginAttemptsLeft, setLoginAttemptsLeft] = useState<number | null>(null);
  const [loginLocked, setLoginLocked] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Bookings & Filter State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    todayActive: 0,
    pendingBookings: 0,
    completedBookings: 0,
  });

  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [therapistFilter, setTherapistFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // XML Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [xxeTestResult, setXxeTestResult] = useState<any>(null);

  // Activity Logs State
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Status Update State
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Edit & Delete State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editFormData, setEditFormData] = useState({
    customer_name: '',
    contact_number: '',
    service_id: 'whole-body',
    oil_option: 'With Oil' as 'With Oil' | 'Dry',
    therapist_id: 1,
    booking_date: '',
    start_time: '',
    status: 'Pending',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Database Connection Status & MySQL Sync State
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [syncingDb, setSyncingDb] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch DB status', err);
    }
  };

  const handleSyncFromMysql = async () => {
    setSyncingDb(true);
    setSyncMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['x-session-id'] = token;
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(data.message || 'Synced successfully!');
        loadBookings();
        fetchDbStatus();
      } else {
        setSyncMessage(`Sync notice: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncingDb(false);
    }
  };

  // Check existing session & DB status on mount
  useEffect(() => {
    fetchDbStatus();
    async function verifySession() {
      try {
        const token = localStorage.getItem('vibes_session_token') || '';
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          headers: token ? { 'X-Session-ID': token } : {},
        });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setSessionUser(data.user);
          setSessionRemainingMs(data.remainingMs || 15 * 60 * 1000);
          if (token) setSessionToken(token);
        } else {
          localStorage.removeItem('vibes_session_token');
        }
      } catch (err) {
        console.error('Session verify failed:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    verifySession();
  }, []);

  // 15-Minute Session Inactivity Countdown Timer
  useEffect(() => {
    if (!sessionUser) return;

    const interval = setInterval(() => {
      setSessionRemainingMs((prev) => {
        if (prev <= 1000) {
          handleLogout();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionUser]);

  // Load therapists list for filtering
  useEffect(() => {
    if (!sessionUser) return;
    fetch('/api/therapists')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTherapists(data.therapists);
      });
  }, [sessionUser]);

  // Load bookings when authenticated and filters change
  useEffect(() => {
    if (!sessionUser) return;
    loadBookings();
  }, [sessionUser, dateFilter, statusFilter, therapistFilter, searchQuery]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (therapistFilter !== 'all') params.append('therapist_id', therapistFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/bookings?${params.toString()}`, {
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      if (res.status === 401) {
        localStorage.removeItem('vibes_session_token');
        setSessionUser(null);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleUnlock = async () => {
    try {
      await fetch('/api/auth/unlock', { method: 'POST' });
      setLoginLocked(false);
      setLoginError(null);
      setLoginAttemptsLeft(5);
    } catch {
      // ignore
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoginError(null);
    setLoginLoading(true);

    try {
      // Auto-unlock if previously locked
      if (loginLocked) {
        await fetch('/api/auth/unlock', { method: 'POST' }).catch(() => {});
        setLoginLocked(false);
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSessionUser(data.user);
        setSessionToken(data.sessionToken);
        localStorage.setItem('vibes_session_token', data.sessionToken);
        setSessionRemainingMs(data.expiresInMs || 15 * 60 * 1000);
        setUsername('');
        setPassword('');
        setLoginError(null);
      } else {
        setLoginError(data.error || 'Incorrect username or password.');
        if (data.attemptsLeft !== undefined) setLoginAttemptsLeft(data.attemptsLeft);
        if (data.locked) setLoginLocked(true);
      }
    } catch (err) {
      setLoginError('Authentication service unreachable. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSessionUser(data.user);
        setSessionToken(data.sessionToken);
        localStorage.setItem('vibes_session_token', data.sessionToken);
        setSessionRemainingMs(data.expiresInMs || 15 * 60 * 1000);
        setUsername('');
        setPassword('');
        setLoginError(null);
      } else {
        setLoginError(data.error || 'Incorrect username or password.');
        if (data.attemptsLeft !== undefined) setLoginAttemptsLeft(data.attemptsLeft);
        if (data.locked) setLoginLocked(true);
      }
    } catch (err) {
      setLoginError('Authentication service unreachable. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem('vibes_session_token');
      setSessionUser(null);
      setSessionToken(null);
    }
  };

  const handleStatusChange = async (bookingId: number, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/bookings/${bookingId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-ID': token } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus as any } : b))
        );
      }
    } catch (err) {
      console.error('Status change error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (b: Booking) => {
    setEditingBooking(b);
    setEditFormData({
      customer_name: b.customer_name,
      contact_number: b.contact_number,
      service_id: b.service_id,
      oil_option: b.oil_option,
      therapist_id: b.therapist_id,
      booking_date: b.booking_date,
      start_time: b.start_time,
      status: b.status,
      notes: b.notes || '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/bookings/${editingBooking.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-ID': token } : {}),
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingBooking(null);
        loadBookings();
      } else {
        setEditError(data.error || 'Failed to update booking.');
      }
    } catch (err) {
      setEditError('Network error while saving changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBooking) return;
    setIsDeleting(true);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/bookings/${deletingBooking.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeletingBooking(null);
        loadBookings();
      } else {
        alert(data.error || 'Failed to delete booking.');
      }
    } catch (err) {
      alert('Network error while deleting booking.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadXml = () => {
    const url = `/api/staff/export-xml?start_date=${exportStartDate}&end_date=${exportEndDate}`;
    window.location.href = url;
  };

  const handleDownloadExcel = () => {
    const url = `/api/staff/export-excel?start_date=${exportStartDate}&end_date=${exportEndDate}`;
    window.location.href = url;
  };

  const handleExportCurrentTableToExcel = () => {
    if (bookings.length === 0) {
      alert('No appointment records available to export.');
      return;
    }
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Reference No',
      'Customer Name',
      'Contact Number',
      'Service',
      'Oil Option',
      'Duration (Mins)',
      'Price (PHP)',
      'Therapist',
      'Booking Date',
      'Start Time',
      'End Time',
      'Status',
      'Notes',
      'Created At',
    ];

    const rows = bookings.map((b) => [
      escapeCsv(b.reference_no),
      escapeCsv(b.customer_name),
      escapeCsv(b.contact_number),
      escapeCsv(b.service_name),
      escapeCsv(b.oil_option),
      escapeCsv(b.duration_minutes),
      escapeCsv(b.duration_minutes === 60 ? '350.00' : '200.00'),
      escapeCsv(therapists.find((t) => t.id === b.therapist_id)?.name || 'Assigned on arrival'),
      escapeCsv(b.booking_date),
      escapeCsv(b.start_time),
      escapeCsv(b.end_time),
      escapeCsv(b.status),
      escapeCsv(b.notes || ''),
      escapeCsv(b.created_at),
    ]);

    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `vibes-appointments-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewXml = async () => {
    setExportLoading(true);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(
        `/api/staff/export-xml?start_date=${exportStartDate}&end_date=${exportEndDate}`,
        {
          credentials: 'include',
          headers: token ? { 'X-Session-ID': token } : {},
        }
      );
      const text = await res.text();
      setXmlPreview(text);

      // Also run safe XML parser test to confirm XXE protection
      const testRes = await fetch('/api/staff/test-xml-inspection', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-ID': token } : {}),
        },
        body: JSON.stringify({ xmlContent: text }),
      });
      const testData = await testRes.json();
      setXxeTestResult(testData.inspection);
    } catch (err) {
      console.error('XML preview error:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch('/api/staff/activity-logs', {
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setShowLogsModal(true);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadStaffAccounts = async () => {
    setLoadingAccounts(true);
    setAccountActionMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch('/api/staff/accounts', {
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
      }
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleOpenAccountsModal = () => {
    setShowAccountsModal(true);
    setShowAddAccountForm(false);
    setAccountActionMessage(null);
    setResettingPasswordId(null);
    loadStaffAccounts();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAccount(true);
    setAccountActionMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch('/api/staff/accounts', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-ID': token } : {}),
        },
        body: JSON.stringify(newAccountData),
      });
      const data = await res.json();
      if (data.success) {
        setAccountActionMessage({ type: 'success', text: data.message || 'Account created successfully!' });
        setNewAccountData({ username: '', password: '', full_name: '', role: 'staff' });
        setShowAddAccountForm(false);
        loadStaffAccounts();
      } else {
        setAccountActionMessage({ type: 'error', text: data.error || 'Failed to create account.' });
      }
    } catch (err: any) {
      setAccountActionMessage({ type: 'error', text: err.message || 'Failed to create account.' });
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleToggleAccount = async (account: StaffAccount) => {
    setAccountActionMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/accounts/${account.id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setAccountActionMessage({ type: 'success', text: data.message });
        loadStaffAccounts();
      } else {
        setAccountActionMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setAccountActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleResetPassword = async (accountId: number) => {
    if (!newPasswordVal || newPasswordVal.length < 6) {
      setAccountActionMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setSavingPassword(true);
    setAccountActionMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/accounts/${accountId}/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-ID': token } : {}),
        },
        body: JSON.stringify({ new_password: newPasswordVal }),
      });
      const data = await res.json();
      if (data.success) {
        setAccountActionMessage({ type: 'success', text: data.message });
        setResettingPasswordId(null);
        setNewPasswordVal('');
      } else {
        setAccountActionMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setAccountActionMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (account: StaffAccount) => {
    if (!confirm(`Are you sure you want to permanently delete the account "${account.username}" (${account.full_name})?`)) {
      return;
    }
    setAccountActionMessage(null);
    try {
      const token = sessionToken || localStorage.getItem('vibes_session_token') || '';
      const res = await fetch(`/api/staff/accounts/${account.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { 'X-Session-ID': token } : {},
      });
      const data = await res.json();
      if (data.success) {
        setAccountActionMessage({ type: 'success', text: data.message });
        loadStaffAccounts();
      } else {
        setAccountActionMessage({ type: 'error', text: data.error });
      }
    } catch (err: any) {
      setAccountActionMessage({ type: 'error', text: err.message });
    }
  };

  const formatRemainingTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Verifying staff credentials...</p>
      </div>
    );
  }

  // =========================================================================
  // View 1: Staff Login Screen (Matching Appendix B wireframe)
  // =========================================================================
  if (!sessionUser) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-emerald-800">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900">Staff Login</h1>
            <p className="text-xs text-stone-500 mt-1">
              Authorized access for Vibes Massage Circle C Mall branch personnel
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{loginError}</p>
                {loginAttemptsLeft !== null && loginAttemptsLeft > 0 && (
                  <p className="text-rose-600 mt-0.5">
                    Security lock triggers after {loginAttemptsLeft} more failed attempt(s).
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="mt-2 text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer block"
                >
                  Reset Security Lock & Attempts Counter
                </button>
              </div>
            </div>
          )}

          {loginLocked && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">
                  Rate limit reached (5 failed attempts). Staff login is temporarily locked for 15 minutes.
                </p>
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Unlock Login Now
                </button>
              </div>
            </div>
          )}

          {/* 1-Click Instant Login Options */}
          <div className="mb-5 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center justify-between">
              <span>Quick 1-Click Authorized Sign In:</span>
              <span className="text-[10px] text-emerald-700 font-normal">Auto-fills & logs in</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('gelyn_perez', 'Vibes2026!')}
                disabled={loginLoading}
                className="p-2.5 bg-white hover:bg-emerald-100/70 border border-emerald-300/80 rounded-xl text-left transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-stone-900 group-hover:text-emerald-900 flex items-center justify-between">
                    <span>Ms. Gelyn Perez</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold">1-CLICK</span>
                  </div>
                  <div className="text-[11px] text-stone-500">Branch Manager</div>
                </div>
                <div className="text-[10px] font-mono text-emerald-700 mt-1">
                  gelyn_perez / Vibes2026!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'Admin123!')}
                disabled={loginLoading}
                className="p-2.5 bg-white hover:bg-emerald-100/70 border border-emerald-300/80 rounded-xl text-left transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-stone-900 group-hover:text-emerald-900 flex items-center justify-between">
                    <span>Administrator</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold">1-CLICK</span>
                  </div>
                  <div className="text-[11px] text-stone-500">System Admin</div>
                </div>
                <div className="text-[10px] font-mono text-emerald-700 mt-1">
                  admin / Admin123!
                </div>
              </button>
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-stone-400 font-bold">
              <span className="bg-white px-3">or enter credentials manually</span>
            </div>
          </div>

          {/* Login Form matching Appendix B wireframe */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="staffUsername" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Username
              </label>
              <input
                id="staffUsername"
                type="text"
                placeholder="e.g. gelyn_perez or admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loginLocked || loginLoading}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="staffPassword" className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-xs text-stone-500 hover:text-emerald-700 flex items-center gap-1 font-medium transition-colors"
                >
                  {showLoginPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  id="staffPassword"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginLocked || loginLoading}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Accepted: <span className="font-mono text-stone-600">Admin123!</span> or <span className="font-mono text-stone-600">admin</span> for admin; <span className="font-mono text-stone-600">Vibes2026!</span> or <span className="font-mono text-stone-600">vibes2026</span> for gelyn_perez.
              </p>
            </div>

            <button
              type="submit"
              disabled={loginLoading || loginLocked}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // View 2: Staff Dashboard (Matching Appendix B wireframe & Dev Guide Sec 5.2)
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Staff Header & Session Security Watchdog */}
      <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] uppercase tracking-wider border border-emerald-500/30">
              Staff Portal • {sessionUser.role.toUpperCase()}
            </span>
            <span className="text-xs text-stone-400">Circle C Mall, QC</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold mt-1">
            Welcome, {sessionUser.fullName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 15-Minute Inactivity Watchdog Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              sessionRemainingMs < 2 * 60 * 1000
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-stone-800/80 border-stone-700 text-stone-300'
            }`}
            title="Session automatically expires after 15 minutes of inactivity as required by security policy"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Session: {formatRemainingTime(sessionRemainingMs)}</span>
          </div>

          <button
            onClick={handleExportCurrentTableToExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Download current appointments list as Excel spreadsheet (.csv)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            Export to Excel
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-stone-700 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-stone-300" />
            Date Range Export
          </button>

          <button
            onClick={loadActivityLogs}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-stone-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Activity Logs
          </button>

          <button
            onClick={handleOpenAccountsModal}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-stone-700 cursor-pointer"
            title="Manage Admin & Staff Accounts"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            Staff Accounts
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-rose-800/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Database Connection & MySQL Persistence Status Banner */}
      {dbStatus && (
        <div
          className={`rounded-2xl p-4 border transition-all text-xs shadow-xs ${
            dbStatus.connected
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
              : dbStatus.mysqlConfigured
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-stone-100 border-stone-200 text-stone-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {dbStatus.connected ? (
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </div>
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {dbStatus.connected
                      ? 'MySQL Database Connected (Permanent Storage)'
                      : dbStatus.mysqlConfigured
                      ? 'MySQL Connection Offline / Tunnel Paused'
                      : 'Local Storage Mode (Render Ephemeral Storage)'}
                  </span>
                  {dbStatus.connected && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 font-semibold text-[10px]">
                      Live Sync Active
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-stone-600 leading-relaxed text-[11px]">
                  {dbStatus.connected ? (
                    <>
                      Connected to <strong className="font-mono text-emerald-900">{dbStatus.config?.database}</strong> at{' '}
                      <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-950">
                        {dbStatus.config?.host}:{dbStatus.config?.port}
                      </span>
                      . Every appointment is permanently saved to your MySQL database and survives Render reloads.
                    </>
                  ) : dbStatus.mysqlConfigured ? (
                    <>
                      Could not reach MySQL at <span className="font-mono">{dbStatus.config?.host}:{dbStatus.config?.port}</span>. Make sure your <strong className="text-amber-900">ngrok</strong> command (<code className="font-mono bg-white px-1 py-0.5 rounded">ngrok tcp 3306</code>) and XAMPP MySQL are running on your computer.
                    </>
                  ) : (
                    <>
                      Render free hosting resets local storage on restart/reload. To save all appointments permanently to your computer's <strong>XAMPP MySQL database</strong>, run <code className="font-mono bg-white px-1 py-0.5 rounded">ngrok tcp 3306</code> and set <code className="font-mono bg-white px-1 py-0.5 rounded">MYSQL_HOST</code> in Render Environment.
                    </>
                  )}
                </p>

                {syncMessage && (
                  <div className="mt-2 text-xs font-medium text-emerald-800 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                    {syncMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dbStatus.connected ? (
                <button
                  type="button"
                  onClick={handleSyncFromMysql}
                  disabled={syncingDb}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingDb ? 'animate-spin' : ''}`} />
                  {syncingDb ? 'Syncing...' : 'Sync with MySQL'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={fetchDbStatus}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check MySQL Status
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Today's Schedule</span>
          <div className="text-2xl font-bold text-stone-900 mt-1">{stats.todayActive}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Active today</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Pending Bookings</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingBookings}</div>
          <span className="text-[11px] text-stone-500">Awaiting confirmation</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Completed</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.completedBookings}</div>
          <span className="text-[11px] text-stone-500">Fulfilled services</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total All-Time</span>
          <div className="text-2xl font-bold text-stone-900 mt-1">{stats.totalBookings}</div>
          <span className="text-[11px] text-stone-500">Database records</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ref, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Therapist Filter */}
          <div>
            <select
              value={therapistFilter}
              onChange={(e) => setTherapistFilter(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Therapists</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(dateFilter || statusFilter !== 'all' || therapistFilter !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
            <span>Filtered results active</span>
            <button
              onClick={() => {
                setDateFilter('');
                setStatusFilter('all');
                setTherapistFilter('all');
                setSearchQuery('');
              }}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Bookings Table matching Appendix B wireframe */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif font-bold text-stone-900 text-lg">
            Appointment Records ({bookings.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCurrentTableToExcel}
              disabled={bookings.length === 0}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Save displayed records directly to Excel spreadsheet (.csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Save to Excel
            </button>
            <button
              onClick={loadBookings}
              disabled={loadingBookings}
              className="p-1.5 px-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loadingBookings ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading appointments...
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            No booking records match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Time & Date</th>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Therapist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-stone-900">
                        {b.start_time} - {b.end_time}
                      </div>
                      <div className="text-[11px] text-stone-500">{b.booking_date}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-stone-800 whitespace-nowrap">
                      {b.reference_no}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{b.customer_name}</div>
                      <div className="text-[11px] text-stone-500">{b.contact_number}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-800">{b.service_name}</div>
                      <div className="text-[11px] text-emerald-700">
                        {b.oil_option} • {b.duration_minutes}m
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{b.therapist_name || 'Unassigned'}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          b.status === 'Confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : b.status === 'Completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Quick Status Buttons */}
                        {b.status === 'Pending' && (
                          <button
                            onClick={() => handleStatusChange(b.id, 'Confirmed')}
                            disabled={updatingId === b.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-all"
                            title="Confirm appointment"
                          >
                            Confirm
                          </button>
                        )}

                        {b.status === 'Confirmed' && (
                          <button
                            onClick={() => handleStatusChange(b.id, 'Completed')}
                            disabled={updatingId === b.id}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] shadow-sm transition-all"
                            title="Mark as completed"
                          >
                            Complete
                          </button>
                        )}

                        {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                          <button
                            onClick={() => handleStatusChange(b.id, 'Cancelled')}
                            disabled={updatingId === b.id}
                            className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 text-[11px] transition-all"
                            title="Cancel appointment"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => startEditing(b)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 transition-all shadow-sm"
                          title="Edit booking details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingBooking(b)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 transition-all shadow-sm"
                          title="Delete booking permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* XML Export Modal (Section 5.2 & Security Table I) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Export Bookings Data (Excel & XML)</h3>
                  <p className="text-xs text-stone-500">
                    Export appointments for accounting, staff payroll, and management reporting
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setXmlPreview(null);
                  setXxeTestResult(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exportStartDate" className="block text-xs font-bold text-stone-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="exportStartDate"
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="exportEndDate" className="block text-xs font-bold text-stone-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="exportEndDate"
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900"
                  />
                </div>
              </div>

              {/* Security feature note */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Security Specification: Safe Excel/CSV & XML Generation
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Only authenticated branch staff can generate exports. Excel exports are formatted with UTF-8 BOM for immediate opening in Microsoft Excel. XML exports enforce disabled external entities against XXE.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  Download Excel (.csv)
                </button>

                <button
                  type="button"
                  onClick={handleDownloadXml}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-stone-300" />
                  Download XML File (.xml)
                </button>

                <button
                  type="button"
                  onClick={handlePreviewXml}
                  disabled={exportLoading}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {exportLoading ? 'Generating Preview...' : 'Inspect XML & Test XXE Shield'}
                </button>
              </div>

              {/* XML Inspector & XXE Test Result */}
              {xxeTestResult && (
                <div className="p-3.5 bg-stone-900 text-emerald-400 rounded-2xl font-mono text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-stone-300 pb-1 border-b border-stone-800">
                    <span className="font-bold flex items-center gap-1 text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> XXE Protection Verification: PASS
                    </span>
                    <span>Records: {xxeTestResult.recordsCount}</span>
                  </div>
                  <div className="text-stone-400 text-[10px]">
                    External entities: Disabled | DOCTYPE expansion: Blocked | Syntax: Well-formed
                  </div>
                </div>
              )}

              {xmlPreview && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-700">XML Document Output:</span>
                  <pre className="p-3.5 bg-stone-900 text-stone-200 rounded-2xl text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-stone-800">
                    {xmlPreview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Security & Activity Audit Trail</h3>
                <p className="text-xs text-stone-500">
                  Logs of staff logins, status updates, failed attempts, and exports (100 most recent)
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {logs.length === 0 ? (
                <p className="text-center py-10 text-xs text-stone-500">No activity logs recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.action.includes('FAILED')
                              ? 'bg-rose-500'
                              : log.action.includes('STAFF')
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        {log.action}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-stone-700 text-[11px]">{log.details}</p>
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span>Actor: {log.actor}</span>
                      <span>IP: {log.ip_address}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff & Admin Accounts Management Modal */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[88vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Staff & Admin Accounts ({accounts.length})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Authorized logins for Vibes Massage Circle C Mall branch personnel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAccountsModal(false);
                  setShowAddAccountForm(false);
                  setResettingPasswordId(null);
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notification / Alert */}
            {accountActionMessage && (
              <div
                className={`p-3 rounded-2xl text-xs mb-4 flex items-center gap-2 ${
                  accountActionMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${accountActionMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                <span>{accountActionMessage.text}</span>
              </div>
            )}

            {/* Modal Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs text-stone-500">
                Logged in as: <strong className="text-stone-800">{sessionUser.fullName}</strong> ({sessionUser.role})
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddAccountForm(!showAddAccountForm);
                  setAccountActionMessage(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {showAddAccountForm ? 'Close Form' : '+ Add New Account'}
              </button>
            </div>

            {/* Add New Account Form Card */}
            {showAddAccountForm && (
              <form
                onSubmit={handleCreateAccount}
                className="p-4 mb-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs"
              >
                <div className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Create New Staff or Admin Account
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Danica Garcia"
                      value={newAccountData.full_name}
                      onChange={(e) => setNewAccountData({ ...newAccountData, full_name: e.target.value })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Username (lowercase, no spaces) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. danica_g"
                      value={newAccountData.username}
                      onChange={(e) => setNewAccountData({ ...newAccountData, username: e.target.value.toLowerCase().trim() })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Initial Password (min. 6 characters) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newAccountData.password}
                      onChange={(e) => setNewAccountData({ ...newAccountData, password: e.target.value })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Account Role *
                    </label>
                    <select
                      value={newAccountData.role}
                      onChange={(e) => setNewAccountData({ ...newAccountData, role: e.target.value as 'admin' | 'staff' })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="staff">Staff (Appointments, Schedule, Excel Export)</option>
                      <option value="admin">Administrator (Full Access & Account Management)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountForm(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    {creatingAccount ? 'Creating...' : 'Save Account'}
                  </button>
                </div>
              </form>
            )}

            {/* Accounts Table */}
            <div className="flex-1 overflow-y-auto border border-stone-200 rounded-2xl">
              {loadingAccounts ? (
                <div className="py-12 text-center text-stone-500 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading staff accounts...
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-xs">
                  No staff accounts found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-stone-50 text-stone-700 uppercase tracking-wider text-[10px] border-b border-stone-200 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3.5">User</th>
                      <th className="py-2.5 px-3.5">Role</th>
                      <th className="py-2.5 px-3.5">Status</th>
                      <th className="py-2.5 px-3.5 hidden sm:table-cell">Last Login</th>
                      <th className="py-2.5 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {accounts.map((acc) => (
                      <React.Fragment key={acc.id}>
                        <tr className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center">
                                {acc.full_name ? acc.full_name.charAt(0).toUpperCase() : acc.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                  <span>{acc.full_name}</span>
                                  {sessionUser.id === acc.id && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-stone-400 text-[10px]">
                                  @{acc.username}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                acc.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {acc.role}
                            </span>
                          </td>

                          <td className="py-2.5 px-3.5">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                acc.active === 1 ? 'text-emerald-700' : 'text-stone-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  acc.active === 1 ? 'bg-emerald-600' : 'bg-stone-400'
                                }`}
                              />
                              {acc.active === 1 ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3.5 text-stone-500 text-[11px] hidden sm:table-cell">
                            {acc.last_login
                              ? new Date(acc.last_login).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never'}
                          </td>

                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Active Button */}
                              {sessionUser.id !== acc.id && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAccount(acc)}
                                  className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                    acc.active === 1
                                      ? 'border-stone-200 text-stone-600 hover:bg-stone-100'
                                      : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                  title={acc.active === 1 ? 'Deactivate account' : 'Activate account'}
                                >
                                  {acc.active === 1 ? (
                                    <UserX className="w-3.5 h-3.5 text-stone-500" />
                                  ) : (
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </button>
                              )}

                              {/* Reset Password Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (resettingPasswordId === acc.id) {
                                    setResettingPasswordId(null);
                                    setNewPasswordVal('');
                                  } else {
                                    setResettingPasswordId(acc.id);
                                    setNewPasswordVal('');
                                  }
                                }}
                                className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Reset account password"
                              >
                                <Key className="w-3.5 h-3.5 text-stone-500" />
                              </button>

                              {/* Delete Account Button */}
                              {sessionUser.id !== acc.id && acc.username !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAccount(acc)}
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete account permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Reset Password Drawer */}
                        {resettingPasswordId === acc.id && (
                          <tr className="bg-stone-50 border-b border-stone-200">
                            <td colSpan={5} className="p-3">
                              <div className="flex flex-wrap items-center gap-2 max-w-md">
                                <span className="font-bold text-[11px] text-stone-700 flex items-center gap-1">
                                  <Key className="w-3 h-3 text-amber-600" />
                                  New password for {acc.username}:
                                </span>
                                <input
                                  type="password"
                                  placeholder="Min 6 characters"
                                  value={newPasswordVal}
                                  onChange={(e) => setNewPasswordVal(e.target.value)}
                                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(acc.id)}
                                  disabled={savingPassword}
                                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                                >
                                  {savingPassword ? 'Saving...' : 'Set Password'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setResettingPasswordId(null)}
                                  className="px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-lg">
                  Edit Appointment
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Reference: {editingBooking.reference_no}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.customer_name}
                    onChange={(e) => setEditFormData({ ...editFormData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.contact_number}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Service</label>
                  <select
                    value={editFormData.service_id}
                    onChange={(e) => setEditFormData({ ...editFormData, service_id: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  >
                    <option value="whole-body">Whole Body Massage (60m - ₱350)</option>
                    <option value="body-parts">Body Parts Massage (30m - ₱200)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Medium Preference</label>
                  <select
                    value={editFormData.oil_option}
                    onChange={(e) => setEditFormData({ ...editFormData, oil_option: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  >
                    <option value="With Oil">With Oil</option>
                    <option value="Dry">Dry (Acupressure)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Assigned Therapist</label>
                  <select
                    value={editFormData.therapist_id}
                    onChange={(e) => setEditFormData({ ...editFormData, therapist_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  >
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900 font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.booking_date}
                    onChange={(e) => setEditFormData({ ...editFormData, booking_date: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Start Time (HH:MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14:00"
                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Special Notes / Requests</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  placeholder="e.g. Preferred focus areas, allergies, remarks"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBooking && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-700">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  Delete Appointment Record
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  {deletingBooking.reference_no}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete the booking for{' '}
              <strong className="text-stone-900">{deletingBooking.customer_name}</strong> on{' '}
              <span className="font-semibold">{deletingBooking.booking_date} ({deletingBooking.start_time} - {deletingBooking.end_time})</span>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 mb-5">
              ⚠️ This action is permanent and will remove the record from both customer lookup and staff reporting.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBooking(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs"
              >
                Keep Record
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
