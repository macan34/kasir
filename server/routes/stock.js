const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/stock - Get all stock information
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id_produk AS id,
        p.nama_produk AS name,
        COALESCE(p.sku, CONCAT('SKU-', LPAD(p.id_produk, 3, '0'))) AS sku,
        p.stok AS stock_quantity,
        COALESCE(p.low_stock_threshold, 5) AS low_stock_threshold,
        COALESCE(p.unit, 'Pcs') AS unit,
        p.harga AS price,
        k.nama_kategori AS category_name,
        c.nama_cabang AS store_name
      FROM tbl_produk p
      LEFT JOIN tbl_kategori k ON p.id_kategori = k.id_kategori
      LEFT JOIN tbl_cabang c ON p.store_id = c.id_cabang
      ORDER BY p.stok ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stock/adjust - Adjust stock (add/subtract)
router.post('/adjust', async (req, res) => {
  try {
    const { product_id, adjustment_type, quantity, notes } = req.body;
    
    // adjustment_type: 'add' or 'subtract' or 'set'
    const [current] = await pool.query('SELECT stok, nama_produk FROM tbl_produk WHERE id_produk = ?', [product_id]);
    if (current.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentStock = current[0].stok;
    const productName = current[0].nama_produk;
    let newStock = currentStock;

    if (adjustment_type === 'add') {
      newStock = currentStock + parseInt(quantity, 10);
    } else if (adjustment_type === 'subtract') {
      newStock = Math.max(0, currentStock - parseInt(quantity, 10));
    } else {
      newStock = Math.max(0, parseInt(quantity, 10));
    }

    await pool.query('UPDATE tbl_produk SET stok = ?, updated_at = NOW() WHERE id_produk = ?', [newStock, product_id]);

    // Record into tbl_log
    try {
      await pool.query(
        'INSERT INTO tbl_log (aktivitas, waktu) VALUES (?, NOW())',
        [`Penyesuaian stok produk "${productName}" dari ${currentStock} menjadi ${newStock} (${notes || adjustment_type})`]
      );
    } catch (e) {}

    res.json({ success: true, product_id, old_stock: currentStock, new_stock: newStock });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
