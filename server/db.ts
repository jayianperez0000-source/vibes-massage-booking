import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from './security.ts';

const DB_FILE = path.resolve(process.cwd(), 'vibes_massage.db');

export const db = new DatabaseSync(DB_FILE);

// Initialize schema and seed data
export function initDatabase() {
  // 1. Therapists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS therapists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      specialization TEXT NOT NULL,
      gender TEXT NOT NULL,
      bio TEXT NOT NULL,
      years_exp INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    );
  `);

  // 2. Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price_php REAL NOT NULL,
      description TEXT NOT NULL
    );
  `);

  // 3. Staff accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
  `);

  // 4. Bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      oil_option TEXT NOT NULL,
      therapist_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      notes TEXT DEFAULT '',
      cancellation_reason TEXT DEFAULT '',
      FOREIGN KEY (therapist_id) REFERENCES therapists(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
  `);

  // 5. Activity logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT NOT NULL
    );
  `);

  // 6. Security rate limits table (persistent across restarts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      action_type TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 1,
      locked_until INTEGER NOT NULL DEFAULT 0,
      last_attempt_at INTEGER NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // Check if therapists exist
  const therapistCount = db.prepare('SELECT COUNT(*) as count FROM therapists').get() as { count: number };
  if (therapistCount.count === 0) {
    const insertTherapist = db.prepare(`
      INSERT INTO therapists (name, title, specialization, gender, bio, years_exp, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const seedTherapists = [
      ['Eduardo "Kuya Ed" Ramos', 'Master Therapist', 'Swedish & Deep Tissue Massage', 'Male', 'Certified licensed therapist with 8 years of dedicated practice in Swedish body release and neuromuscular relaxation.', 8],
      ['Maria Santos', 'Senior Therapist', 'Shiatsu & Gentle Acupressure', 'Female', 'Expert in rhythmic Japanese shiatsu pressure points and tension relief with 6 years experience.', 6],
      ['Roberto Cruz', 'Therapeutic Specialist', 'Combination Massage & Muscle Decompression', 'Male', 'Specializes in personalized whole-body tension release and restorative stretching techniques.', 7],
      ['Teresa Mendoza', 'Holistic Practitioner', 'Aromatherapy & Calming Strokes', 'Female', 'Master of therapeutic essential oil application and stress mitigation with 5 years experience.', 5],
      ['Juan Bautista', 'Traditional Hilot Master', 'Hilot & Targeted Body Parts', 'Male', 'Practitioner of authentic Filipino Hilot balancing and localized knot dissolution with 9 years experience.', 9],
      ['Elena Reyes', 'Upper Body Specialist', 'Head, Neck, Shoulder & Dry Acupressure', 'Female', 'Dedicated focus on desk-fatigue, tension headaches, and localized neck relief.', 4],
      ['Ricardo Aquino', 'Deep Pressure Specialist', 'Sports Recovery & Myofascial Therapy', 'Male', 'Deep tissue specialist working with active clients and intense physical stress release.', 8],
      ['Grace Dela Cruz', 'Reflexology Specialist', 'Foot Reflexology & Body Restoration', 'Female', 'Certified in plantar reflexology zones and gentle full-body rejuvenation.', 6],
      ['Antonio Morales', 'Back & Spinal Specialist', 'Back, Scapula & Spinal Alignment Care', 'Male', 'Focused care on upper/lower lumbar comfort, postural fatigue, and gentle mobilization.', 5],
      ['Carmela Flores', 'Relaxation Specialist', 'Soothing Full-Body & Hand Therapy', 'Female', 'Known for rhythmic gentle strokes, soothing touch, and whole-body nervous system grounding.', 7],
    ];

    for (const t of seedTherapists) {
      insertTherapist.run(t[0], t[1], t[2], t[3], t[4], t[5]);
    }
  }

  // Check if services exist
  const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (servicesCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (id, name, duration_minutes, price_php, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertService.run(
      'whole-body',
      'Whole Body Massage',
      60,
      350.00,
      'A complete 60-minute therapeutic full body massage relieving systemic muscle fatigue, improving blood circulation, and promoting deep serenity.'
    );

    insertService.run(
      'body-parts',
      'Body Parts Massage',
      30,
      200.00,
      'A focused 30-minute targeted therapy for specific tension zones such as back, head/neck/shoulders, or lower legs and feet.'
    );
  }

  // Check if staff exist
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM staff').get() as { count: number };
  if (staffCount.count === 0) {
    const insertStaff = db.prepare(`
      INSERT INTO staff (username, password_hash, full_name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    // Default staff credentials for Vibes Massage Circle C Mall branch:
    // admin / Admin123!
    // gelyn_perez / Vibes2026! (Branch Manager mentioned in paper)
    insertStaff.run('admin', hashPassword('Admin123!'), 'System Administrator', 'admin', now);
    insertStaff.run('gelyn_perez', hashPassword('Vibes2026!'), 'Ms. Gelyn Perez (Branch Manager)', 'staff', now);
  }

  // Check if initial sample bookings exist for realistic preview demo
  const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
  if (bookingCount.count === 0) {
    const today = new Date().toISOString().split('T')[0];
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        reference_no, customer_name, contact_number, service_id, service_name,
        oil_option, therapist_id, booking_date, start_time, end_time, duration_minutes,
        status, created_at, updated_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    insertBooking.run(
      'VM-20261026-001',
      'Juan Dela Cruz',
      '09171234567',
      'whole-body',
      'Whole Body Massage',
      'With Oil',
      1,
      today,
      '11:00',
      '12:00',
      60,
      'Confirmed',
      now,
      now,
      'Prefers medium pressure on lower back'
    );

    insertBooking.run(
      'VM-20261026-002',
      'Maria Clara Reyes',
      '09289876543',
      'body-parts',
      'Body Parts Massage',
      'Dry',
      2,
      today,
      '13:30',
      '14:00',
      30,
      'Pending',
      now,
      now,
      'Focus on neck and shoulders'
    );

    insertBooking.run(
      'VM-20261026-003',
      'Anthony Tan',
      '09395551234',
      'whole-body',
      'Whole Body Massage',
      'With Oil',
      3,
      today,
      '15:00',
      '16:00',
      60,
      'Completed',
      now,
      now,
      'Regular client'
    );
  }
}
