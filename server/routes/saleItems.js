const express = require('express');
const router = express.Router();
const pool = require('../db');

let columnsChecked = false;
let hasCustomColumns = false;

async function checkColumns() {
  if (columnsChecked) return hasCustomColumns;
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_detail_transaksi' AND COLUMN_NAME = 'product_name'"
    );
    hasCustomColumns = cols.length > 0;
    columnsChecked = true;
  } catch (e) {
    hasCustomColumns = false;
  }
  return hasCustomColumns;
}

// POST /api/sale-items - Bulk insert sale items into tbl_detail_transaksi
router.post('/', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const hasExtras = await checkColumns();

    if (hasExtras) {
      const values = items.map(item => [
        item.sale_id,
        item.product_id,
        item.quantity,
        item.line_total,
        item.product_name || '',
        item.unit_price || 0,
      ]);

      await pool.query(
        `INSERT INTO tbl_detail_transaksi (id_transaksi, id_produk, jumlah, subtotal, product_name, unit_price) 
         VALUES ?`,
        [values]
      );
    } else {
      const values = items.map(item => [
        item.sale_id,
        item.product_id,
        item.quantity,
        item.line_total,
      ]);

      await pool.query(
        `INSERT INTO tbl_detail_transaksi (id_transaksi, id_produk, jumlah, subtotal) 
         VALUES ?`,
        [values]
      );
    }

    res.json({ success: true, count: items.length });
  } catch (err) {
    console.error('Error creating sale items:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
