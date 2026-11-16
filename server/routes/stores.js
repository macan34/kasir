const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/stores - List all branches from tbl_cabang
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_cabang AS id, nama_cabang AS name, kota AS address, created_at FROM tbl_cabang ORDER BY nama_cabang'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching stores:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stores - Create new branch
router.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tbl_cabang (nama_cabang, kota) VALUES (?, ?)',
      [name, address]
    );
    res.json({ id: result.insertId, name, address, created_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error creating store:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
