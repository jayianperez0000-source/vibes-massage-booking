import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

// ==========================================
// 1. Password Hashing (Equivalent to PHP password_hash / password_verify)
// ==========================================
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

// ==========================================
// 2. Output Encoding (htmlspecialchars equivalent)
// ==========================================
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const stringVal = String(str);
  return stringVal
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 3. Session Store & 15-Minute Inactivity Expiry
// ==========================================
export interface StaffSession {
  sessionId: string;
  staffId: number;
  username: string;
  fullName: string;
  role: string;
  lastActive: number;
  createdAt: number;
}

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes as specified in security document

const sessions = new Map<string, StaffSession>();

export function createSession(staff: { id: number; username: string; full_name: string; role: string }): StaffSession {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: StaffSession = {
    sessionId,
    staffId: staff.id,
    username: staff.username,
    fullName: staff.full_name,
    role: staff.role,
    lastActive: now,
    createdAt: now,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string | undefined): StaffSession | null {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();
  // Check 15-minute inactivity expiration
  if (now - session.lastActive > INACTIVITY_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return null;
  }

  // Refresh activity
  session.lastActive = now;
  return session;
}

export function destroySession(sessionId: string | undefined) {
  if (sessionId) {
    sessions.delete(sessionId);
  }
}

// Role-based auth middleware for Express
export function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.vibes_session_id || req.headers['x-session-id'];
  const session = getSession(typeof sessionId === 'string' ? sessionId : undefined);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid staff session required. Session may have expired due to 15 minutes of inactivity.',
      sessionExpired: true,
    });
  }

  (req as any).staffUser = session;
  next();
}

// ==========================================
// 4. CSRF Protection
// ==========================================
const csrfTokens = new Set<string>();

export function generateCsrfToken(): string {
  const token = crypto.randomBytes(24).toString('hex');
  csrfTokens.add(token);
  // Keep set memory bounded
  if (csrfTokens.size > 1000) {
    const iter = csrfTokens.values();
    for (let i = 0; i < 200; i++) {
      const val = iter.next().value;
      if (val) csrfTokens.delete(val);
    }
  }
  return token;
}

export function verifyCsrfToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  return csrfTokens.has(token);
}

// ==========================================
// 5. Rate Limiting (5 Attempts Lockout)
// ==========================================
interface RateLimitResult {
  allowed: boolean;
  attemptsLeft: number;
  lockedUntil: number;
  message?: string;
}

export function checkRateLimit(ip: string, actionType: 'lookup' | 'login'): RateLimitResult {
  const now = Date.now();
  const maxAttempts = 5;
  const lockoutDurationMs = actionType === 'lookup' ? 10 * 60 * 1000 : 15 * 60 * 1000;

  // Retrieve current rate limit record using prepared statement
  const stmt = db.prepare('SELECT * FROM rate_limit_logs WHERE ip = ? AND action_type = ?');
  const record = stmt.get(ip, actionType) as any;

  if (record) {
    // If locked and lock period is still active
    if (record.locked_until > now) {
      const waitMinutes = Math.ceil((record.locked_until - now) / 60000);
      return {
        allowed: false,
        attemptsLeft: 0,
        lockedUntil: record.locked_until,
        message: `Too many failed attempts. Security cooldown active. Please try again in ${waitMinutes} minute(s).`,
      };
    }

    // If cooldown has passed, reset counter if last attempt was older than lockout window
    if (now - record.last_attempt_at > lockoutDurationMs) {
      db.prepare('DELETE FROM rate_limit_logs WHERE ip = ? AND action_type = ?').run(ip, actionType);
      return { allowed: true, attemptsLeft: maxAttempts, lockedUntil: 0 };
    }

    return {
      allowed: true,
      attemptsLeft: Math.max(0, maxAttempts - record.attempts),
      lockedUntil: 0,
    };
  }

  return { allowed: true, attemptsLeft: maxAttempts, lockedUntil: 0 };
}

export function recordFailedAttempt(ip: string, actionType: 'lookup' | 'login'): RateLimitResult {
  const now = Date.now();
  const maxAttempts = 5;
  const lockoutDurationMs = actionType === 'lookup' ? 10 * 60 * 1000 : 15 * 60 * 1000;

  const stmt = db.prepare('SELECT * FROM rate_limit_logs WHERE ip = ? AND action_type = ?');
  const record = stmt.get(ip, actionType) as any;

  if (!record) {
    db.prepare(`
      INSERT INTO rate_limit_logs (ip, action_type, attempts, locked_until, last_attempt_at)
      VALUES (?, ?, 1, 0, ?)
    `).run(ip, actionType, now);

    return { allowed: true, attemptsLeft: maxAttempts - 1, lockedUntil: 0 };
  } else {
    const newAttempts = record.attempts + 1;
    let lockedUntil = 0;
    if (newAttempts >= maxAttempts) {
      lockedUntil = now + lockoutDurationMs;
    }

    db.prepare(`
      UPDATE rate_limit_logs
      SET attempts = ?, locked_until = ?, last_attempt_at = ?
      WHERE ip = ? AND action_type = ?
    `).run(newAttempts, lockedUntil, now, ip, actionType);

    if (lockedUntil > 0) {
      const waitMinutes = Math.ceil(lockoutDurationMs / 60000);
      return {
        allowed: false,
        attemptsLeft: 0,
        lockedUntil,
        message: `Security limit reached: 5 consecutive failed attempts. Temporarily blocked for ${waitMinutes} minutes.`,
      };
    }

    return {
      allowed: true,
      attemptsLeft: maxAttempts - newAttempts,
      lockedUntil: 0,
    };
  }
}

export function resetRateLimit(ip: string, actionType: 'lookup' | 'login') {
  db.prepare('DELETE FROM rate_limit_logs WHERE ip = ? AND action_type = ?').run(ip, actionType);
}

// ==========================================
// 6. Secure XML Generation & XXE Protection
// ==========================================
export function generateBookingsXml(bookings: any[], exportMeta: { exportedBy: string; startDate: string; endDate: string }): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!-- Vibes Massage Booking System - Circle C Mall Branch XML Export -->');
  lines.push('<bookings_export generated_at="' + new Date().toISOString() + '" exported_by="' + escapeHtml(exportMeta.exportedBy) + '">');
  lines.push('  <metadata>');
  lines.push(`    <branch>Circle C Mall, Quezon City</branch>`);
  lines.push(`    <date_range_start>${escapeHtml(exportMeta.startDate)}</date_range_start>`);
  lines.push(`    <date_range_end>${escapeHtml(exportMeta.endDate)}</date_range_end>`);
  lines.push(`    <total_records>${bookings.length}</total_records>`);
  lines.push('  </metadata>');
  lines.push('  <records>');

  for (const b of bookings) {
    lines.push('    <booking id="' + b.id + '">');
    lines.push(`      <reference_number>${escapeHtml(b.reference_no)}</reference_number>`);
    lines.push(`      <date>${escapeHtml(b.booking_date)}</date>`);
    lines.push(`      <start_time>${escapeHtml(b.start_time)}</start_time>`);
    lines.push(`      <end_time>${escapeHtml(b.end_time)}</end_time>`);
    lines.push(`      <duration_minutes>${b.duration_minutes}</duration_minutes>`);
    lines.push(`      <service_name>${escapeHtml(b.service_name)}</service_name>`);
    lines.push(`      <oil_option>${escapeHtml(b.oil_option)}</oil_option>`);
    lines.push(`      <therapist_name>${escapeHtml(b.therapist_name || 'Unassigned')}</therapist_name>`);
    lines.push(`      <customer_name>${escapeHtml(b.customer_name)}</customer_name>`);
    lines.push(`      <contact_number>${escapeHtml(b.contact_number)}</contact_number>`);
    lines.push(`      <status>${escapeHtml(b.status)}</status>`);
    lines.push(`      <created_at>${escapeHtml(b.created_at)}</created_at>`);
    if (b.notes) {
      lines.push(`      <notes>${escapeHtml(b.notes)}</notes>`);
    }
    lines.push('    </booking>');
  }

  lines.push('  </records>');
  lines.push('</bookings_export>');
  return lines.join('\n');
}

// Strict parser for XML import/testing with external entity (XXE) mitigation
export function safelyParseXmlForInspection(xmlString: string): { valid: boolean; recordsCount: number; xxeDetected: boolean; error?: string } {
  // Check for malicious XXE constructs: <!ENTITY, SYSTEM, PUBLIC, <!DOCTYPE with external refs
  const hasDocType = /<!DOCTYPE/i.test(xmlString);
  const hasEntity = /<!ENTITY/i.test(xmlString);
  const hasSystem = /SYSTEM\s+["']/i.test(xmlString);
  const hasPublic = /PUBLIC\s+["']/i.test(xmlString);

  if (hasEntity || hasSystem || hasPublic) {
    return {
      valid: false,
      recordsCount: 0,
      xxeDetected: true,
      error: 'Security Warning: XML contains external entity declarations or DOCTYPE entities (XXE). Blocked by security policy.',
    };
  }

  // Count records safely via regex matching
  const matchRecords = xmlString.match(/<booking\b[^>]*>/gi);
  return {
    valid: true,
    recordsCount: matchRecords ? matchRecords.length : 0,
    xxeDetected: false,
  };
}

// ==========================================
// 7. Activity Logger
// ==========================================
export function logActivity(actor: string, action: string, details: string, ip: string) {
  try {
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (timestamp, actor, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(timestamp, actor, action, details, ip);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
