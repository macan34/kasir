const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/logs - Get activity logs from tbl_log & log_pelanggan
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_log AS id, aktivitas AS activity, waktu AS created_at FROM tbl_log ORDER BY id_log DESC LIMIT 100'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs/customer-changes - Get changes from log_perubahan_pelanggan
router.get('/customer-changes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_log AS id, id_pelanggan, nama_lama, nama_baru, waktu AS created_at FROM log_perubahan_pelanggan ORDER BY id_log DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching customer changes:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
