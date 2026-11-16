const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/categories - List all categories from tbl_kategori
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_kategori AS id, nama_kategori AS name, NULL AS description, NOW() AS created_at FROM tbl_kategori ORDER BY nama_kategori'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories - Create category
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tbl_kategori (nama_kategori) VALUES (?)',
      [name]
    );
    try {
      await pool.query('INSERT INTO tbl_log (aktivitas, waktu) VALUES (?, NOW())', [`Membuat kategori produk ${name}`]);
    } catch(e) {}
    res.json({ id: result.insertId, name, description: description || null, created_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    await pool.query('UPDATE tbl_kategori SET nama_kategori = ? WHERE id_kategori = ?', [name, id]);
    res.json({ id: parseInt(id, 10), name });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tbl_kategori WHERE id_kategori = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
