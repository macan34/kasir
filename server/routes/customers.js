const express = require('express');
const router = express.Router();
const pool = require('../db');

function getMemberFields(body) {
  const memberRef = String(body.member_ref || '').trim() || null;
  const isMember = Boolean(body.is_member);
  const memberDiscount = Number(body.member_discount || 0);

  if (!Number.isFinite(memberDiscount) || memberDiscount < 0 || memberDiscount > 100) {
    return { error: 'Diskon member harus antara 0 sampai 100 persen.' };
  }
  if (isMember && !memberRef) {
    return { error: 'Kode kartu/REF wajib diisi untuk mengaktifkan member.' };
  }

  return {
    member_ref: memberRef,
    is_member: isMember ? 1 : 0,
    member_discount: memberDiscount,
  };
}

async function ensureMemberRefAvailable(memberRef, customerId) {
  if (!memberRef) return true;
  const query = customerId
    ? 'SELECT id_pelanggan FROM tbl_pelanggan WHERE member_ref = ? AND id_pelanggan <> ? LIMIT 1'
    : 'SELECT id_pelanggan FROM tbl_pelanggan WHERE member_ref = ? LIMIT 1';
  const params = customerId ? [memberRef, customerId] : [memberRef];
  const [rows] = await pool.query(query, params);
  return rows.length === 0;
}

// GET /api/customers - List customers from tbl_pelanggan
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_pelanggan AS id, nama_pelanggan AS name, kota AS city, created_at,
              member_ref, is_member, member_discount
       FROM tbl_pelanggan ORDER BY id_pelanggan DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/member-settings', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM tbl_pos_settings WHERE setting_key = 'member_default_discount' LIMIT 1"
    );
    res.json({ default_member_discount: Number(rows[0]?.setting_value || 0) });
  } catch (err) {
    console.error('Error fetching member settings:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/member-settings', async (req, res) => {
  try {
    const discount = Number(req.body.default_member_discount);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({ error: 'Diskon default harus antara 0 sampai 100 persen.' });
    }

    await pool.query(
      `INSERT INTO tbl_pos_settings (setting_key, setting_value)
       VALUES ('member_default_discount', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [String(discount)]
    );
    res.json({ default_member_discount: discount });
  } catch (err) {
    console.error('Error saving member settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - Add customer (triggers after_insert_pelanggan!)
router.post('/', async (req, res) => {
  try {
    const { name, city } = req.body;
    const memberFields = getMemberFields(req.body);
    if (!String(name || '').trim()) {
      return res.status(400).json({ error: 'Nama pelanggan wajib diisi.' });
    }
    if (memberFields.error) return res.status(400).json({ error: memberFields.error });
    if (!(await ensureMemberRefAvailable(memberFields.member_ref))) {
      return res.status(409).json({ error: 'Kode kartu/REF tersebut sudah digunakan pelanggan lain.' });
    }

    const [result] = await pool.query(
      `INSERT INTO tbl_pelanggan
       (nama_pelanggan, kota, member_ref, is_member, member_discount)
       VALUES (?, ?, ?, ?, ?)`,
      [String(name).trim(), city || null, memberFields.member_ref, memberFields.is_member, memberFields.member_discount]
    );
    res.json({
      id: result.insertId,
      name: String(name).trim(),
      city: city || null,
      ...memberFields,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error adding customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - Update customer (triggers after_pelanggan_update & after_update_pelanggan!)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city } = req.body;
    const memberFields = getMemberFields(req.body);
    if (!String(name || '').trim()) {
      return res.status(400).json({ error: 'Nama pelanggan wajib diisi.' });
    }
    if (memberFields.error) return res.status(400).json({ error: memberFields.error });
    if (!(await ensureMemberRefAvailable(memberFields.member_ref, id))) {
      return res.status(409).json({ error: 'Kode kartu/REF tersebut sudah digunakan pelanggan lain.' });
    }

    await pool.query(
      `UPDATE tbl_pelanggan
       SET nama_pelanggan = ?, kota = ?, member_ref = ?, is_member = ?, member_discount = ?
       WHERE id_pelanggan = ?`,
      [String(name).trim(), city || null, memberFields.member_ref, memberFields.is_member, memberFields.member_discount, id]
    );
    res.json({ id: parseInt(id, 10), name: String(name).trim(), city: city || null, ...memberFields });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tbl_pelanggan WHERE id_pelanggan = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
