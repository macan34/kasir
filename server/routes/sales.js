const express = require('express');
const router = express.Router();
const pool = require('../db');

let columnsChecked = false;
let hasCustomColumns = false;

async function checkColumns() {
  if (columnsChecked) return hasCustomColumns;
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_transaksi' AND COLUMN_NAME = 'invoice_number'"
    );
    hasCustomColumns = cols.length > 0;
    columnsChecked = true;
  } catch (e) {
    hasCustomColumns = false;
  }
  return hasCustomColumns;
}

// GET /api/sales - List sales/transactions
router.get('/', async (req, res) => {
  try {
    const hasExtras = await checkColumns();

    let query = `
      SELECT 
        t.id_transaksi AS id,
        COALESCE(t.invoice_number, CONCAT('INV-', LPAD(t.id_transaksi, 6, '0'))) AS invoice_number,
        t.store_id,
        c.nama_cabang AS store_name,
        COALESCE(t.customer_name, p.nama_pelanggan, 'Pelanggan Umum') AS customer_name,
        COALESCE(t.subtotal, t.total_belanja, 0) AS subtotal,
        COALESCE(t.tax_amount, 0) AS tax_amount,
        COALESCE(t.discount_amount, 0) AS discount_amount,
        t.total_belanja AS total,
        COALESCE(t.payment_method, 'cash') AS payment_method,
        COALESCE(t.payment_status, 'paid') AS payment_status,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      LEFT JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan
      LEFT JOIN tbl_cabang c ON t.store_id = c.id_cabang
    `;

    const params = [];
    const conditions = [];

    if (req.query.date_from) {
      conditions.push('(t.created_at >= ? OR t.tanggal >= ?)');
      params.push(req.query.date_from, req.query.date_from);
    }

    if (req.query.customer_name_not_null === 'true') {
      conditions.push('(t.customer_name IS NOT NULL OR p.nama_pelanggan IS NOT NULL)');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY COALESCE(t.created_at, TIMESTAMP(t.tanggal)) DESC';

    const [rows] = await pool.query(query, params);

    const sales = rows.map(row => ({
      ...row,
      total: parseFloat(row.total) || 0,
      subtotal: parseFloat(row.subtotal) || 0,
      tax_amount: parseFloat(row.tax_amount) || 0,
      discount_amount: parseFloat(row.discount_amount) || 0,
    }));

    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: err.message });
  }
});

// Keep this before /:id so "customers" is not treated as a transaction ID.
router.get('/customers', async (req, res) => {
  try {
    const hasExtras = await checkColumns();

    let rows;
    if (hasExtras) {
      const [data] = await pool.query(
        `SELECT DISTINCT customer_name
         FROM tbl_transaksi
         WHERE customer_name IS NOT NULL AND customer_name != ''
         UNION
         SELECT DISTINCT nama_pelanggan AS customer_name
         FROM tbl_pelanggan
         WHERE nama_pelanggan IS NOT NULL AND nama_pelanggan != ''`
      );
      rows = data;
    } else {
      const [data] = await pool.query(
        'SELECT DISTINCT nama_pelanggan AS customer_name FROM tbl_pelanggan WHERE nama_pelanggan IS NOT NULL AND nama_pelanggan != ""'
      );
      rows = data;
    }

    res.json(rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/:id - Get sale with detail items (for Receipt Printing)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [sales] = await pool.query(
      `SELECT 
        t.id_transaksi AS id,
        COALESCE(t.invoice_number, CONCAT('INV-', LPAD(t.id_transaksi, 6, '0'))) AS invoice_number,
        t.store_id,
        c.nama_cabang AS store_name,
        c.kota AS store_address,
        COALESCE(t.customer_name, p.nama_pelanggan, 'Pelanggan Umum') AS customer_name,
        COALESCE(t.subtotal, t.total_belanja, 0) AS subtotal,
        COALESCE(t.tax_amount, 0) AS tax_amount,
        COALESCE(t.discount_amount, 0) AS discount_amount,
        t.total_belanja AS total,
        COALESCE(t.payment_method, 'cash') AS payment_method,
        COALESCE(t.payment_status, 'paid') AS payment_status,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      LEFT JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan
      LEFT JOIN tbl_cabang c ON t.store_id = c.id_cabang
      WHERE t.id_transaksi = ?`,
      [id]
    );

    if (sales.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const sale = sales[0];

    // Fetch items from tbl_detail_transaksi
    const [items] = await pool.query(
      `SELECT 
        dt.id_detail AS id,
        dt.id_produk AS product_id,
        COALESCE(dt.product_name, pr.nama_produk, 'Produk') AS product_name,
        dt.jumlah AS quantity,
        COALESCE(dt.unit_price, pr.harga, dt.subtotal / NULLIF(dt.jumlah, 0)) AS unit_price,
        dt.subtotal AS line_total
      FROM tbl_detail_transaksi dt
      LEFT JOIN tbl_produk pr ON dt.id_produk = pr.id_produk
      WHERE dt.id_transaksi = ?`,
      [id]
    );

    res.json({
      ...sale,
      total: parseFloat(sale.total) || 0,
      subtotal: parseFloat(sale.subtotal) || 0,
      tax_amount: parseFloat(sale.tax_amount) || 0,
      discount_amount: parseFloat(sale.discount_amount) || 0,
      items: items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity, 10) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        line_total: parseFloat(item.line_total) || 0,
      })),
    });
  } catch (err) {
    console.error('Error fetching sale details:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sales - Create new sale
router.post('/', async (req, res) => {
  try {
    const { invoice_number, store_id, customer_name, subtotal, tax_amount, discount_amount, total, payment_method, payment_status } = req.body;
    const hasExtras = await checkColumns();

    // Match or create customer in tbl_pelanggan
    let id_pelanggan = 1;
    if (customer_name) {
      const [existing] = await pool.query(
        'SELECT id_pelanggan FROM tbl_pelanggan WHERE nama_pelanggan = ? LIMIT 1',
        [customer_name]
      );
      if (existing.length > 0) {
        id_pelanggan = existing[0].id_pelanggan;
      } else {
        const [newPelanggan] = await pool.query(
          'INSERT INTO tbl_pelanggan (nama_pelanggan) VALUES (?)',
          [customer_name]
        );
        id_pelanggan = newPelanggan.insertId;
      }
    }

    let insertId;
    if (hasExtras) {
      const [result] = await pool.query(
        `INSERT INTO tbl_transaksi (id_pelanggan, tanggal, total_belanja, invoice_number, store_id, customer_name, subtotal, tax_amount, discount_amount, payment_method, payment_status, created_at) 
         VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [id_pelanggan, total, invoice_number, store_id || null, customer_name || null, subtotal, tax_amount, discount_amount, payment_method || 'cash', payment_status || 'paid']
      );
      insertId = result.insertId;
    } else {
      const [result] = await pool.query(
        `INSERT INTO tbl_transaksi (id_pelanggan, tanggal, total_belanja) 
         VALUES (?, CURDATE(), ?)`,
        [id_pelanggan, total]
      );
      insertId = result.insertId;
    }

    // Insert log
    try {
      await pool.query(
        'INSERT INTO tbl_log (aktivitas, waktu) VALUES (?, NOW())',
        [`Melakukan transaksi baru ID: ${insertId} senilai Rp ${total}`]
      );
    } catch (e) {}

    res.json({
      id: insertId,
      invoice_number: invoice_number || `INV-${String(insertId).padStart(6, '0')}`,
      store_id: store_id || null,
      customer_name: customer_name || null,
      subtotal: parseFloat(subtotal) || 0,
      tax_amount: parseFloat(tax_amount) || 0,
      discount_amount: parseFloat(discount_amount) || 0,
      total: parseFloat(total) || 0,
      payment_method: payment_method || 'cash',
      payment_status: payment_status || 'paid',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
