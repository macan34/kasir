const crypto = require('crypto');
const pool = require('../db');

const sessions = new Map();
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

function issueSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_LIFETIME_MS });
  return token;
}

function revokeSession(token) {
  if (token) sessions.delete(token);
}

function revokeUserSessions(userId) {
  for (const [token, session] of sessions) {
    if (String(session.userId) === String(userId)) sessions.delete(token);
  }
}

async function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const session = token && sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Sesi login tidak valid atau sudah berakhir.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, username, display_name, role, is_active
       FROM tbl_users WHERE id = ? LIMIT 1`,
      [session.userId]
    );
    if (!rows.length || !rows[0].is_active) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan.' });
    }

    req.user = {
      id: rows[0].id,
      username: rows[0].username,
      name: rows[0].display_name,
      role: rows[0].role,
    };
    next();
  } catch (err) {
    console.error('Error validating login session:', err);
    res.status(500).json({ error: 'Gagal memvalidasi sesi login.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses hanya tersedia untuk Super Admin.' });
    }
    next();
  };
}

module.exports = { issueSession, revokeSession, revokeUserSessions, requireAuth, requireRole };
