const express = require('express');
const pool = require('../db');
const { verifyPassword } = require('../auth/passwords');
const { issueSession, revokeSession, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/status', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM tbl_users');
    res.json({ setup_required: Number(rows[0].count) === 0 });
  } catch (err) {
    console.error('Error checking account setup:', err);
    res.status(500).json({ error: 'Gagal memeriksa status akun.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = req.body.password;
    if (!username || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password maksimal 128 karakter.' });
    }

    const [rows] = await pool.query(
      `SELECT id, username, display_name, password_hash, role, is_active
       FROM tbl_users WHERE username = ? LIMIT 1`,
      [username]
    );
    if (!rows.length || !rows[0].is_active || !(await verifyPassword(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = rows[0];
    const token = issueSession(user.id);
    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.display_name, role: user.role },
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Gagal memproses login.' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  revokeSession(token);
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
