import mysql, { Pool } from 'mysql2/promise';
import { db } from './db.ts';

interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: any;
}

let pool: Pool | null = null;
let isConnected = false;
let lastError: string | null = null;
let lastSyncTime: string | null = null;

export function getMysqlConfig(): MysqlConfig | null {
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  if (!host) {
    return null;
  }

  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306;
  const user = process.env.MYSQL_USER || process.env.DB_USER || 'root';
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'vibes_massage';

  const config: MysqlConfig = {
    host,
    port,
    user,
    password,
    database,
  };

  // If using cloud MySQL like TiDB, Aiven, or PlanetScale that requires SSL
  if (process.env.MYSQL_SSL === 'true' || process.env.DATABASE_URL?.includes('ssl=')) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export async function initMysql(): Promise<boolean> {
  const config = getMysqlConfig();
  if (!config) {
    console.log('[MySQL] No MYSQL_HOST configured. Running in standalone SQLite mode.');
    return false;
  }

  try {
    console.log(`[MySQL] Attempting connection to ${config.user}@${config.host}:${config.port}/${config.database}...`);
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    isConnected = true;
    lastError = null;
    console.log(`[MySQL] Successfully connected to MySQL at ${config.host}:${config.port}!`);

    // Ensure tables exist in MySQL
    await ensureMysqlTables();

    // Initial sync from MySQL -> local SQLite cache
    await syncFromMysql();

    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || String(err);
    console.warn(`[MySQL] Could not connect to MySQL (${lastError}). Application will use SQLite cache and retry.`);
    return false;
  }
}

async function ensureMysqlTables() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS therapists (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        title VARCHAR(100) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        gender ENUM('Male', 'Female') NOT NULL,
        bio TEXT NOT NULL,
        years_exp INT NOT NULL DEFAULT 1,
        active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        duration_minutes INT NOT NULL,
        price_php DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        last_login DATETIME NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT NOT NULL AUTO_INCREMENT,
        reference_no VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(150) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        service_id VARCHAR(50) NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        oil_option ENUM('With Oil', 'Dry') NOT NULL,
        therapist_id INT NOT NULL,
        booking_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        duration_minutes INT NOT NULL,
        status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        notes TEXT NULL,
        cancellation_reason TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_bookings_ref (reference_no),
        INDEX idx_bookings_date (booking_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT NOT NULL AUTO_INCREMENT,
        timestamp DATETIME NOT NULL,
        actor VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err: any) {
    console.error('[MySQL] Error ensuring MySQL tables:', err.message);
  }
}

/**
 * Synchronize all bookings and seed data from MySQL into the local SQLite database.
 * This guarantees that when Render reloads/restarts, all previous bookings from MySQL XAMPP are loaded immediately!
 */
export async function syncFromMysql(): Promise<{ success: boolean; count: number; error?: string }> {
  if (!pool) return { success: false, count: 0, error: 'MySQL not configured' };

  try {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY id ASC');
    const mysqlBookings = rows as any[];

    // Insert or update bookings in local SQLite cache
    const upsertBooking = db.prepare(`
      INSERT INTO bookings (
        id, reference_no, customer_name, contact_number, service_id, service_name,
        oil_option, therapist_id, booking_date, start_time, end_time, duration_minutes,
        status, created_at, updated_at, notes, cancellation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(reference_no) DO UPDATE SET
        customer_name = excluded.customer_name,
        contact_number = excluded.contact_number,
        service_id = excluded.service_id,
        service_name = excluded.service_name,
        oil_option = excluded.oil_option,
        therapist_id = excluded.therapist_id,
        booking_date = excluded.booking_date,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        duration_minutes = excluded.duration_minutes,
        status = excluded.status,
        updated_at = excluded.updated_at,
        notes = excluded.notes,
        cancellation_reason = excluded.cancellation_reason
    `);

    for (const b of mysqlBookings) {
      // Format date if needed
      let bDate = b.booking_date;
      if (bDate instanceof Date) {
        bDate = bDate.toISOString().split('T')[0];
      } else if (typeof bDate === 'string' && bDate.includes('T')) {
        bDate = bDate.split('T')[0];
      }

      let cAt = b.created_at;
      if (cAt instanceof Date) cAt = cAt.toISOString();

      let uAt = b.updated_at;
      if (uAt instanceof Date) uAt = uAt.toISOString();

      upsertBooking.run(
        b.id,
        b.reference_no,
        b.customer_name,
        b.contact_number,
        b.service_id,
        b.service_name,
        b.oil_option,
        b.therapist_id,
        bDate,
        b.start_time,
        b.end_time,
        b.duration_minutes,
        b.status,
        cAt || new Date().toISOString(),
        uAt || new Date().toISOString(),
        b.notes || '',
        b.cancellation_reason || ''
      );
    }

    lastSyncTime = new Date().toISOString();
    isConnected = true;
    lastError = null;
    console.log(`[MySQL] Synced ${mysqlBookings.length} booking records from MySQL to local engine.`);
    return { success: true, count: mysqlBookings.length };
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || String(err);
    console.error('[MySQL] Sync error:', lastError);
    return { success: false, count: 0, error: lastError || 'Unknown sync error' };
  }
}

/**
 * Real-time save: Inserts a newly booked appointment directly into MySQL.
 */
export async function saveBookingToMysql(booking: {
  reference_no: string;
  customer_name: string;
  contact_number: string;
  service_id: string;
  service_name: string;
  oil_option: string;
  therapist_id: number | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO bookings (
        reference_no, customer_name, contact_number, service_id, service_name,
        oil_option, therapist_id, booking_date, start_time, end_time, duration_minutes,
        status, created_at, updated_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        contact_number = VALUES(contact_number),
        service_id = VALUES(service_id),
        service_name = VALUES(service_name),
        oil_option = VALUES(oil_option),
        therapist_id = VALUES(therapist_id),
        booking_date = VALUES(booking_date),
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        duration_minutes = VALUES(duration_minutes),
        status = VALUES(status),
        updated_at = VALUES(updated_at),
        notes = VALUES(notes)`,
      [
        booking.reference_no,
        booking.customer_name,
        booking.contact_number,
        booking.service_id,
        booking.service_name,
        booking.oil_option,
        booking.therapist_id,
        booking.booking_date,
        booking.start_time,
        booking.end_time,
        booking.duration_minutes,
        booking.status,
        booking.created_at,
        booking.updated_at,
        booking.notes || '',
      ]
    );
    console.log(`[MySQL] Appointment ${booking.reference_no} saved to MySQL successfully.`);
  } catch (err: any) {
    console.error(`[MySQL] Failed to save booking ${booking.reference_no} to MySQL:`, err.message);
  }
}

/**
 * Real-time update: Updates booking in MySQL when staff edits details or changes status.
 */
export async function updateBookingInMysql(booking: {
  reference_no: string;
  customer_name?: string;
  contact_number?: string;
  service_id?: string;
  service_name?: string;
  oil_option?: string;
  therapist_id?: number | null;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  status?: string;
  updated_at: string;
  notes?: string;
  cancellation_reason?: string;
}) {
  if (!pool) return;
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (booking.customer_name !== undefined) { fields.push('customer_name = ?'); values.push(booking.customer_name); }
    if (booking.contact_number !== undefined) { fields.push('contact_number = ?'); values.push(booking.contact_number); }
    if (booking.service_id !== undefined) { fields.push('service_id = ?'); values.push(booking.service_id); }
    if (booking.service_name !== undefined) { fields.push('service_name = ?'); values.push(booking.service_name); }
    if (booking.oil_option !== undefined) { fields.push('oil_option = ?'); values.push(booking.oil_option); }
    if (booking.therapist_id !== undefined) { fields.push('therapist_id = ?'); values.push(booking.therapist_id); }
    if (booking.booking_date !== undefined) { fields.push('booking_date = ?'); values.push(booking.booking_date); }
    if (booking.start_time !== undefined) { fields.push('start_time = ?'); values.push(booking.start_time); }
    if (booking.end_time !== undefined) { fields.push('end_time = ?'); values.push(booking.end_time); }
    if (booking.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(booking.duration_minutes); }
    if (booking.status !== undefined) { fields.push('status = ?'); values.push(booking.status); }
    if (booking.notes !== undefined) { fields.push('notes = ?'); values.push(booking.notes); }
    if (booking.cancellation_reason !== undefined) { fields.push('cancellation_reason = ?'); values.push(booking.cancellation_reason); }

    fields.push('updated_at = ?');
    values.push(booking.updated_at);

    values.push(booking.reference_no);

    await pool.query(`UPDATE bookings SET ${fields.join(', ')} WHERE reference_no = ?`, values);
    console.log(`[MySQL] Appointment ${booking.reference_no} updated in MySQL.`);
  } catch (err: any) {
    console.error(`[MySQL] Failed to update booking ${booking.reference_no} in MySQL:`, err.message);
  }
}

/**
 * Real-time delete: Removes booking from MySQL.
 */
export async function deleteBookingFromMysql(reference_no: string) {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM bookings WHERE reference_no = ?', [reference_no]);
    console.log(`[MySQL] Appointment ${reference_no} deleted from MySQL.`);
  } catch (err: any) {
    console.error(`[MySQL] Failed to delete booking ${reference_no} from MySQL:`, err.message);
  }
}

/**
 * Activity log to MySQL
 */
export async function logActivityToMysql(actor: string, action: string, details: string, ip: string) {
  if (!pool) return;
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      'INSERT INTO activity_logs (timestamp, actor, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [timestamp, actor, action, details, ip]
    );
  } catch (err: any) {
    // Silent ignore for log failure
  }
}

/**
 * Return current MySQL connection and configuration status
 */
export async function getDatabaseStatus() {
  const config = getMysqlConfig();
  if (!config) {
    return {
      mode: 'sqlite_standalone',
      mysqlConfigured: false,
      connected: false,
      message: 'Running in SQLite mode. On Render, local storage is reset when service restarts. Connect to MySQL (XAMPP via ngrok or cloud MySQL) to persist data permanently.',
      config: null,
      lastSync: lastSyncTime,
      lastError: null,
    };
  }

  // Ping if pool exists
  let pingOk = false;
  if (pool) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      pingOk = true;
      isConnected = true;
      lastError = null;
    } catch (e: any) {
      pingOk = false;
      isConnected = false;
      lastError = e.message || String(e);
    }
  }

  return {
    mode: pingOk ? 'mysql_connected' : 'mysql_configured_unreachable',
    mysqlConfigured: true,
    connected: pingOk,
    message: pingOk
      ? `Connected to MySQL database "${config.database}" at ${config.host}:${config.port}. All bookings save permanently to MySQL.`
      : `Cannot reach MySQL at ${config.host}:${config.port} (${lastError || 'Connection refused'}). Make sure your ngrok or MySQL server is running.`,
    config: {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
    },
    lastSync: lastSyncTime,
    lastError,
  };
}
