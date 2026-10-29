export interface Therapist {
  id: number;
  name: string;
  title: string;
  specialization: string;
  gender: 'Male' | 'Female';
  bio: string;
  years_exp: number;
  active: number;
}

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_php: number;
  description: string;
}

export interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  freeTherapistCount: number;
  candidateTherapistIds: number[];
}

export interface Booking {
  id: number;
  reference_no: string;
  customer_name: string;
  contact_number: string;
  service_id: string;
  service_name: string;
  price_php?: number;
  oil_option: 'With Oil' | 'Dry';
  therapist_id: number;
  therapist_name?: string;
  therapist_title?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at?: string;
  notes?: string;
  cancellation_reason?: string;
}

export interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ip_address: string;
}

export interface SecurityAudit {
  preparedStatements: { status: string; desc: string };
  passwordHashing: { status: string; desc: string };
  rateLimiting: {
    status: string;
    desc: string;
    clientLookupAttemptsLeft: number;
    clientLookupLocked: boolean;
    clientLoginAttemptsLeft: number;
  };
  sessionInactivity: { status: string; desc: string };
  csrfProtection: { status: string; desc: string };
  outputEncoding: { status: string; desc: string };
  xxePrevention: { status: string; desc: string };
  httpsTransmission: { status: string; desc: string };
  leastPrivilege: { status: string; desc: string };
}
