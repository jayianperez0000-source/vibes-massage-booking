import mysql, { Pool as MysqlPool } from 'mysql2/promise';
import { db } from './db.ts';

interface DatabaseConfig {
  driver: 'mysql' | 'postgres' | 'sqlite';
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: any;
}

let mysqlPool: MysqlPool | null = null;
let pgPool: any = null;
let activeDriver: 'mysql' | 'postgres' | 'sqlite' = 'sqlite';
let isConnected = false;
let lastError: string | null = null;
let lastSyncTime: string | null = null;

export function getDatabaseConfig(): DatabaseConfig {
  const preferDriver = process.env.DB_DRIVER || process.env.DATABASE_DRIVER;
  const mysqlHost = process.env.MYSQL_HOST || process.env.DB_HOST;

  // 1. Separate MySQL Environment Variables (e.g. TiDB Cloud Serverless or local XAMPP)
  if ((mysqlHost && preferDriver !== 'postgres') || preferDriver === 'mysql') {
    const host = mysqlHost || 'localhost';
    const isTiDb = host.includes('tidbcloud.com');
    const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT) || (isTiDb ? 4000 : 3306);
    const user = process.env.MYSQL_USER || process.env.DB_USER || 'root';
    const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
    const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'vibes_massage';
    const ssl = (process.env.MYSQL_SSL === 'true' || isTiDb) ? { rejectUnauthorized: false } : undefined;

    return {
      driver: 'mysql',
      host,
      port,
      user,
      password,
      database,
      ssl,
    };
  }

  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.POSTGRES_URL;

  // 2. MySQL URL (e.g. mysql://user:pass@gateway01...:4000/vibes_massage?ssl=true)
  if (dbUrl && (dbUrl.startsWith('mysql://') || dbUrl.startsWith('mysqls://'))) {
    try {
      const url = new URL(dbUrl);
      const host = url.hostname;
      const isTiDb = host.includes('tidbcloud.com');
      const port = Number(url.port) || (isTiDb ? 4000 : 3306);
      const user = decodeURIComponent(url.username || 'root');
      const password = decodeURIComponent(url.password || '');
      const database = url.pathname.replace(/^\//, '') || 'vibes_massage';
      const ssl = url.searchParams.get('ssl') === 'true' || url.protocol === 'mysqls:' || process.env.MYSQL_SSL === 'true' || url.search.includes('ssl=') || isTiDb
        ? { rejectUnauthorized: false }
        : undefined;

      return {
        driver: 'mysql',
        host,
        port,
        user,
        password,
        database,
        ssl,
      };
    } catch (e) {
      console.error('[DB] Error parsing MySQL DATABASE_URL:', e);
    }
  }

  // 3. PostgreSQL URL (e.g. Render Free PostgreSQL, Neon, Supabase)
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    return {
      driver: 'postgres',
      url: dbUrl,
    };
  }

  return { driver: 'sqlite' };
}

export async function initMysql(): Promise<boolean> {
  const config = getDatabaseConfig();

  if (config.driver === 'postgres' && config.url) {
    try {
      console.log('[DB] Connecting to PostgreSQL database (e.g. Render PostgreSQL)...');
      let pgModule: any;
      try {
        pgModule = await import('pg');
      } catch (importErr) {
        throw new Error('Package "pg" not found. If using PostgreSQL on Render, add "pg" to package.json, or configure TiDB/MySQL instead.');
      }
      const PgPool = pgModule.default?.Pool || pgModule.Pool;
      const needsSsl = config.url.includes('render.com') || config.url.includes('neon.tech') || config.url.includes('supabase') || config.url.includes('sslmode=require');
      pgPool = new PgPool({
        connectionString: config.url,
        ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 8000,
        max: 10,
      });

      const client = await pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();

      activeDriver = 'postgres';
      isConnected = true;
      lastError = null;
      console.log('[DB] Successfully connected to PostgreSQL!');

      await ensurePostgresTables();
      await syncFromRemote();
      return true;
    } catch (err: any) {
      activeDriver = 'sqlite';
      isConnected = false;
      lastError = err.message || String(err);
      console.warn(`[DB] PostgreSQL connection error: ${lastError}. Falling back to SQLite cache.`);
      return false;
    }
  }

  if (config.driver === 'mysql' && config.host) {
    try {
      console.log(`[DB] Connecting to MySQL at ${config.user}@${config.host}:${config.port}/${config.database}...`);
      mysqlPool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 8000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });

      const conn = await mysqlPool.getConnection();
      await conn.ping();
      conn.release();

      activeDriver = 'mysql';
      isConnected = true;
      lastError = null;
      console.log(`[DB] Successfully connected to MySQL at ${config.host}:${config.port}!`);

      await ensureMysqlTables();
      await syncFromRemote();
      return true;
    } catch (err: any) {
      activeDriver = 'sqlite';
      isConnected = false;
      lastError = err.message || String(err);
      console.warn(`[DB] MySQL connection error: ${lastError}. Falling back to SQLite cache.`);
      return false;
    }
  }

  console.log('[DB] No external database configured. Running in SQLite mode (ephemeral on Render).');
  activeDriver = 'sqlite';
  return false;
}

async function ensurePostgresTables() {
  if (!pgPool) return;
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS therapists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        title VARCHAR(100) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        gender VARCHAR(10) NOT NULL,
        bio TEXT NOT NULL,
        years_exp INT NOT NULL DEFAULT 1,
        active INT NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        duration_minutes INT NOT NULL,
        price_php NUMERIC(10,2) NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        active INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL,
        last_login TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        reference_no VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(150) NOT NULL,
        contact_number VARCHAR(50) NOT NULL,
        service_id VARCHAR(50) NOT NULL,
        service_name VARCHAR(150) NOT NULL,
        oil_option VARCHAR(20) NOT NULL,
        therapist_id INT NOT NULL,
        booking_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        duration_minutes INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        notes TEXT,
        cancellation_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        actor VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        ip_address VARCHAR(50) NOT NULL
      );
    `);
    console.log('[DB] PostgreSQL tables verified.');
  } catch (err: any) {
    console.error('[DB] PostgreSQL schema error:', err.message);
  }
}

async function ensureMysqlTables() {
  if (!mysqlPool) return;
  try {
    await mysqlPool.query(`
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

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        duration_minutes INT NOT NULL,
        price_php DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await mysqlPool.query(`
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

    await mysqlPool.query(`
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

    await mysqlPool.query(`
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
    console.error('[DB] MySQL schema error:', err.message);
  }
}

/**
 * Synchronize bookings from persistent database (PostgreSQL or MySQL) into SQLite cache.
 * Guarantees that when Render wakes up or restarts, all appointments are restored instantly!
 */
export async function syncFromRemote(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let rows: any[] = [];

    if (activeDriver === 'postgres' && pgPool) {
      const res = await pgPool.query('SELECT * FROM bookings ORDER BY id ASC');
      rows = res.rows;
    } else if (activeDriver === 'mysql' && mysqlPool) {
      const [mysqlRows] = await mysqlPool.query('SELECT * FROM bookings ORDER BY id ASC');
      rows = mysqlRows as any[];
    } else {
      return { success: false, count: 0, error: 'No external database connected' };
    }

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

    for (const b of rows) {
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

    // 2. Upload any local bookings that only exist in SQLite (e.g. booked before DB connection was added)
    const remoteRefNos = new Set(rows.map((r: any) => r.reference_no));
    const localBookings = db.prepare('SELECT * FROM bookings').all() as any[];
    let pushedCount = 0;

    for (const lb of localBookings) {
      if (!remoteRefNos.has(lb.reference_no)) {
        await saveBookingToMysql({
          reference_no: lb.reference_no,
          customer_name: lb.customer_name,
          contact_number: lb.contact_number,
          service_id: lb.service_id,
          service_name: lb.service_name,
          oil_option: lb.oil_option,
          therapist_id: lb.therapist_id,
          booking_date: lb.booking_date,
          start_time: lb.start_time,
          end_time: lb.end_time,
          duration_minutes: lb.duration_minutes,
          status: lb.status,
          created_at: lb.created_at,
          updated_at: lb.updated_at,
          notes: lb.notes || '',
        });
        pushedCount++;
        console.log(`[DB] Pushed local booking ${lb.reference_no} (${lb.customer_name}) to ${activeDriver.toUpperCase()}!`);
      }
    }

    lastSyncTime = new Date().toISOString();
    isConnected = true;
    lastError = null;
    console.log(`[DB] Sync complete: Restored ${rows.length} records, pushed ${pushedCount} local records to ${activeDriver.toUpperCase()}.`);
    return { success: true, count: rows.length + pushedCount };
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || String(err);
    console.error('[DB] Sync error:', lastError);
    return { success: false, count: 0, error: lastError || 'Unknown sync error' };
  }
}

export const syncFromMysql = syncFromRemote;

/**
 * Real-time save: Writes appointment to external database immediately.
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
  if (activeDriver === 'postgres' && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO bookings (
          reference_no, customer_name, contact_number, service_id, service_name,
          oil_option, therapist_id, booking_date, start_time, end_time, duration_minutes,
          status, created_at, updated_at, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (reference_no) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          contact_number = EXCLUDED.contact_number,
          service_id = EXCLUDED.service_id,
          service_name = EXCLUDED.service_name,
          oil_option = EXCLUDED.oil_option,
          therapist_id = EXCLUDED.therapist_id,
          booking_date = EXCLUDED.booking_date,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          duration_minutes = EXCLUDED.duration_minutes,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          notes = EXCLUDED.notes`,
        [
          booking.reference_no,
          booking.customer_name,
          booking.contact_number,
          booking.service_id,
          booking.service_name,
          booking.oil_option,
          booking.therapist_id || 1,
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
      console.log(`[PostgreSQL] Saved booking ${booking.reference_no} permanently.`);
    } catch (err: any) {
      console.error('[PostgreSQL] Save booking error:', err.message);
    }
  } else if (activeDriver === 'mysql' && mysqlPool) {
    try {
      await mysqlPool.query(
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
      console.log(`[MySQL] Saved booking ${booking.reference_no} permanently.`);
    } catch (err: any) {
      console.error('[MySQL] Save booking error:', err.message);
    }
  }
}

/**
 * Real-time update in external database
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
  if (activeDriver === 'postgres' && pgPool) {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (booking.customer_name !== undefined) { updates.push(`customer_name = $${idx++}`); values.push(booking.customer_name); }
      if (booking.contact_number !== undefined) { updates.push(`contact_number = $${idx++}`); values.push(booking.contact_number); }
      if (booking.service_id !== undefined) { updates.push(`service_id = $${idx++}`); values.push(booking.service_id); }
      if (booking.service_name !== undefined) { updates.push(`service_name = $${idx++}`); values.push(booking.service_name); }
      if (booking.oil_option !== undefined) { updates.push(`oil_option = $${idx++}`); values.push(booking.oil_option); }
      if (booking.therapist_id !== undefined) { updates.push(`therapist_id = $${idx++}`); values.push(booking.therapist_id); }
      if (booking.booking_date !== undefined) { updates.push(`booking_date = $${idx++}`); values.push(booking.booking_date); }
      if (booking.start_time !== undefined) { updates.push(`start_time = $${idx++}`); values.push(booking.start_time); }
      if (booking.end_time !== undefined) { updates.push(`end_time = $${idx++}`); values.push(booking.end_time); }
      if (booking.duration_minutes !== undefined) { updates.push(`duration_minutes = $${idx++}`); values.push(booking.duration_minutes); }
      if (booking.status !== undefined) { updates.push(`status = $${idx++}`); values.push(booking.status); }
      if (booking.notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(booking.notes); }
      if (booking.cancellation_reason !== undefined) { updates.push(`cancellation_reason = $${idx++}`); values.push(booking.cancellation_reason); }

      updates.push(`updated_at = $${idx++}`);
      values.push(booking.updated_at);

      values.push(booking.reference_no);
      await pgPool.query(`UPDATE bookings SET ${updates.join(', ')} WHERE reference_no = $${idx}`, values);
    } catch (err: any) {
      console.error('[PostgreSQL] Update booking error:', err.message);
    }
  } else if (activeDriver === 'mysql' && mysqlPool) {
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
      await mysqlPool.query(`UPDATE bookings SET ${fields.join(', ')} WHERE reference_no = ?`, values);
    } catch (err: any) {
      console.error('[MySQL] Update booking error:', err.message);
    }
  }
}

/**
 * Real-time delete in external database
 */
export async function deleteBookingFromMysql(reference_no: string) {
  if (activeDriver === 'postgres' && pgPool) {
    try {
      await pgPool.query('DELETE FROM bookings WHERE reference_no = $1', [reference_no]);
    } catch (err: any) {
      console.error('[PostgreSQL] Delete booking error:', err.message);
    }
  } else if (activeDriver === 'mysql' && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM bookings WHERE reference_no = ?', [reference_no]);
    } catch (err: any) {
      console.error('[MySQL] Delete booking error:', err.message);
    }
  }
}

/**
 * Activity log in external database
 */
export async function logActivityToMysql(actor: string, action: string, details: string, ip: string) {
  if (activeDriver === 'postgres' && pgPool) {
    try {
      const timestamp = new Date().toISOString();
      await pgPool.query(
        'INSERT INTO activity_logs (timestamp, actor, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [timestamp, actor, action, details, ip]
      );
    } catch (e) {}
  } else if (activeDriver === 'mysql' && mysqlPool) {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await mysqlPool.query(
        'INSERT INTO activity_logs (timestamp, actor, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
        [timestamp, actor, action, details, ip]
      );
    } catch (e) {}
  }
}

/**
 * Returns database health and persistence status
 */
export async function getDatabaseStatus() {
  const config = getDatabaseConfig();

  if (activeDriver === 'postgres' && pgPool) {
    try {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      return {
        mode: 'postgres_connected',
        driver: 'PostgreSQL',
        mysqlConfigured: true,
        connected: true,
        message: 'Connected to PostgreSQL Database (Permanent Cloud Storage). All bookings survive reloads and redeploys!',
        config: { host: 'Render PostgreSQL / Cloud', database: 'vibes_massage' },
        lastSync: lastSyncTime,
        lastError: null,
      };
    } catch (e: any) {
      return {
        mode: 'postgres_error',
        driver: 'PostgreSQL',
        mysqlConfigured: true,
        connected: false,
        message: `PostgreSQL connection error: ${e.message}`,
        config: null,
        lastSync: lastSyncTime,
        lastError: e.message,
      };
    }
  }

  if (activeDriver === 'mysql' && mysqlPool) {
    try {
      const conn = await mysqlPool.getConnection();
      await conn.ping();
      conn.release();
      return {
        mode: 'mysql_connected',
        driver: 'MySQL',
        mysqlConfigured: true,
        connected: true,
        message: `Connected to MySQL database "${config.database}" at ${config.host}:${config.port}. All bookings survive reloads!`,
        config: { host: config.host, port: config.port, database: config.database },
        lastSync: lastSyncTime,
        lastError: null,
      };
    } catch (e: any) {
      return {
        mode: 'mysql_error',
        driver: 'MySQL',
        mysqlConfigured: true,
        connected: false,
        message: `MySQL unreachable: ${e.message}`,
        config: null,
        lastSync: lastSyncTime,
        lastError: e.message,
      };
    }
  }

  return {
    mode: 'sqlite_standalone',
    driver: 'SQLite (Ephemeral)',
    mysqlConfigured: false,
    connected: false,
    message: 'Running in Local Storage mode. Render free tier resets local files on deploy/reload. Add Render Free PostgreSQL (New -> PostgreSQL) or Cloud MySQL to make data permanent.',
    config: null,
    lastSync: lastSyncTime,
    lastError: null,
  };
}
