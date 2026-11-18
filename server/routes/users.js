const express = require('express');
const pool = require('../db');
const { hashPassword } = require('../auth/passwords');
const { requireRole, revokeUserSessions } = require('../middleware/auth');

const router = express.Router();
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const ALLOWED_ROLES = new Set(['cashier', 'customer']);

router.use(requireRole('superadmin'));

function validateAccount({ username, name, password, role }, requirePassword) {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username.trim().toLowerCase())) {
    return 'Username harus 3–32 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.';
  }
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return 'Nama harus berisi 2–100 karakter.';
  }
  if (requirePassword || password) {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return 'Password harus 8–128 karakter.';
    }
  }
  if (!ALLOWED_ROLES.has(role)) return 'Peran akun harus Kasir atau Pelanggan.';
  return null;
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, display_name AS name, role, is_active, created_at
       FROM tbl_users ORDER BY created_at DESC, id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing user accounts:', err);
    res.status(500).json({ error: 'Gagal memuat akun pengguna.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const name = req.body.name;
    const password = req.body.password;
    const role = req.body.role;
    const validationError = validateAccount({ username, name, password, role }, true);
    if (validationError) return res.status(400).json({ error: validationError });

    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(
      `INSERT INTO tbl_users (username, display_name, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [username, name.trim(), passwordHash, role]
    );
    res.status(201).json({
      id: result.insertId,
      username,
      name: name.trim(),
      role,
      is_active: 1,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }
    console.error('Error creating user account:', err);
    res.status(500).json({ error: 'Gagal membuat akun pengguna.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const username = String(req.body.username || '').trim().toLowerCase();
    const { name, password, role } = req.body;
    const isActive = req.body.is_active === true || req.body.is_active === 1;
    const validationError = validateAccount({ username, name, password, role }, false);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID akun tidak valid.' });
    }

    const [existing] = await pool.query(
      'SELECT id, role FROM tbl_users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    if (existing[0].role === 'superadmin') {
      return res.status(403).json({ error: 'Akun Super Admin tidak dapat diubah dari halaman ini.' });
    }

    if (password) {
      const passwordHash = await hashPassword(password);
      await pool.query(
        `UPDATE tbl_users
         SET username = ?, display_name = ?, password_hash = ?, role = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [username, name.trim(), passwordHash, role, isActive ? 1 : 0, id]
      );
    } else {
      await pool.query(
        `UPDATE tbl_users
         SET username = ?, display_name = ?, role = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [username, name.trim(), role, isActive ? 1 : 0, id]
      );
    }

    revokeUserSessions(id);
    res.json({ id, username, name: name.trim(), role, is_active: isActive ? 1 : 0 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }
    console.error('Error updating user account:', err);
    res.status(500).json({ error: 'Gagal memperbarui akun pengguna.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID akun tidak valid.' });
    }
    const [result] = await pool.query(
      'DELETE FROM tbl_users WHERE id = ? AND role <> ?',
      [id, 'superadmin']
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Akun tidak ditemukan.' });
    revokeUserSessions(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user account:', err);
    res.status(500).json({ error: 'Gagal menghapus akun pengguna.' });
  }
});

module.exports = router;
