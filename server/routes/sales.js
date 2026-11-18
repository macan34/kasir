const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../middleware/auth');

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
router.get('/', requireRole('superadmin', 'cashier'), async (req, res) => {
  try {
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
        COALESCE(t.order_status, 'approved') AS order_status,
        (SELECT COUNT(*) FROM tbl_detail_transaksi dt WHERE dt.id_transaksi = t.id_transaksi) AS item_count,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      LEFT JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan
      LEFT JOIN tbl_cabang c ON t.store_id = c.id_cabang
    `;

    const params = [];
    const conditions = ["COALESCE(t.payment_status, 'paid') = 'paid'"];

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
router.get('/customers', requireRole('superadmin', 'cashier'), async (req, res) => {
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

router.get('/orders', requireRole('superadmin', 'cashier'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        t.id_transaksi AS id,
        COALESCE(t.invoice_number, CONCAT('INV-', LPAD(t.id_transaksi, 6, '0'))) AS invoice_number,
        COALESCE(t.customer_name, p.nama_pelanggan, 'Pelanggan Umum') AS customer_name,
        t.total_belanja AS total,
        COALESCE(t.payment_method, 'qris_dummy') AS payment_method,
        t.payment_status,
        t.order_status,
        (SELECT COUNT(*) FROM tbl_detail_transaksi dt WHERE dt.id_transaksi = t.id_transaksi) AS item_count,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      LEFT JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan
      WHERE t.payment_status = 'paid' AND t.order_status = 'pending_approval'
      ORDER BY t.created_at ASC, t.id_transaksi ASC`
    );
    res.json(rows.map(row => ({ ...row, total: Number(row.total) || 0 })));
  } catch (err) {
    console.error('Error fetching orders awaiting approval:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-orders', requireRole('customer'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        t.id_transaksi AS id,
        COALESCE(t.invoice_number, CONCAT('INV-', LPAD(t.id_transaksi, 6, '0'))) AS invoice_number,
        t.total_belanja AS total,
        COALESCE(t.payment_method, 'qris_dummy') AS payment_method,
        COALESCE(t.payment_status, 'pending') AS payment_status,
        t.order_status,
        (SELECT COUNT(*) FROM tbl_detail_transaksi dt WHERE dt.id_transaksi = t.id_transaksi) AS item_count,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      WHERE t.created_by_user_id = ?
      ORDER BY t.created_at DESC, t.id_transaksi DESC`,
      [req.user.id]
    );
    res.json(rows.map(row => ({ ...row, total: Number(row.total) || 0 })));
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pay-dummy', requireRole('customer'), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id_transaksi, created_by_user_id, payment_status, order_status
       FROM tbl_transaksi WHERE id_transaksi = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }

    const order = orders[0];
    if (String(order.created_by_user_id) !== String(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ error: 'Pesanan ini bukan milik akun Anda.' });
    }
    if (order.payment_status !== 'pending' || order.order_status !== 'awaiting_payment') {
      await connection.rollback();
      return res.status(409).json({ error: 'Pesanan tidak lagi menunggu pembayaran.' });
    }

    const [details] = await connection.query(
      'SELECT id_produk, jumlah FROM tbl_detail_transaksi WHERE id_transaksi = ?',
      [order.id_transaksi]
    );
    if (!details.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Pesanan belum memiliki barang.' });
    }

    const quantities = new Map();
    for (const detail of details) {
      const productId = Number(detail.id_produk);
      quantities.set(productId, (quantities.get(productId) || 0) + Number(detail.jumlah));
    }

    for (const [productId, quantity] of quantities) {
      const [products] = await connection.query(
        'SELECT id_produk, nama_produk, stok FROM tbl_produk WHERE id_produk = ? FOR UPDATE',
        [productId]
      );
      if (!products.length || Number(products[0].stok) < quantity) {
        await connection.rollback();
        return res.status(409).json({
          error: products.length
            ? `Stok ${products[0].nama_produk} tidak mencukupi untuk pesanan ini.`
            : 'Salah satu produk pesanan sudah tidak tersedia.',
        });
      }
      await connection.query(
        'UPDATE tbl_produk SET stok = stok - ? WHERE id_produk = ?',
        [quantity, productId]
      );
    }

    await connection.query(
      `UPDATE tbl_transaksi
       SET payment_method = 'qris_dummy', payment_status = 'paid', order_status = 'pending_approval'
       WHERE id_transaksi = ?`,
      [order.id_transaksi]
    );
    await connection.commit();
    res.json({ success: true, payment_status: 'paid', order_status: 'pending_approval' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error confirming simulated QRIS payment:', err);
    res.status(500).json({ error: 'Gagal mengonfirmasi pembayaran simulasi.' });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/:id/approve', requireRole('superadmin', 'cashier'), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id_transaksi, payment_status, order_status
       FROM tbl_transaksi WHERE id_transaksi = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    if (orders[0].payment_status !== 'paid' || orders[0].order_status !== 'pending_approval') {
      await connection.rollback();
      return res.status(409).json({ error: 'Hanya pesanan yang sudah dibayar yang dapat disetujui.' });
    }

    const [details] = await connection.query(
      'SELECT id_detail FROM tbl_detail_transaksi WHERE id_transaksi = ? LIMIT 1',
      [orders[0].id_transaksi]
    );
    if (!details.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Pesanan tidak memiliki rincian barang.' });
    }

    await connection.query(
      `UPDATE tbl_transaksi
       SET order_status = 'approved', approved_by_user_id = ?, approved_at = NOW()
       WHERE id_transaksi = ?`,
      [req.user.id, orders[0].id_transaksi]
    );
    await connection.commit();
    res.json({ success: true, order_status: 'approved' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error approving customer order:', err);
    res.status(500).json({ error: 'Gagal menyetujui pesanan.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/sales/:id - Get sale with detail items (for Receipt Printing)
router.get('/:id', requireRole('superadmin', 'cashier'), async (req, res) => {
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
        COALESCE(t.order_status, 'approved') AS order_status,
        COALESCE(t.created_at, TIMESTAMP(t.tanggal)) AS created_at
      FROM tbl_transaksi t
      LEFT JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan
      LEFT JOIN tbl_cabang c ON t.store_id = c.id_cabang
      WHERE t.id_transaksi = ? AND COALESCE(t.payment_status, 'paid') = 'paid'`,
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
router.post('/', requireRole('superadmin', 'cashier', 'customer'), async (req, res) => {
  try {
    const { invoice_number, store_id, customer_name, subtotal, tax_amount, discount_amount, total, payment_method } = req.body;
    const hasExtras = await checkColumns();
    if (!hasExtras) {
      return res.status(503).json({ error: 'Skema POS belum siap. Jalankan migrasi database terlebih dahulu.' });
    }

    const isCustomerOrder = req.user.role === 'customer';
    const finalPaymentStatus = isCustomerOrder ? 'pending' : 'paid';
    const finalOrderStatus = isCustomerOrder ? 'awaiting_payment' : 'approved';
    const finalPaymentMethod = isCustomerOrder ? 'qris_dummy' : payment_method || 'cash';

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

    const [result] = await pool.query(
      `INSERT INTO tbl_transaksi (
        id_pelanggan, tanggal, total_belanja, invoice_number, store_id, customer_name,
        subtotal, tax_amount, discount_amount, payment_method, payment_status, created_at,
        order_status, created_by_user_id
      ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        id_pelanggan,
        total,
        invoice_number,
        store_id || null,
        customer_name || null,
        subtotal,
        tax_amount,
        discount_amount,
        finalPaymentMethod,
        finalPaymentStatus,
        finalOrderStatus,
        req.user.id,
      ]
    );
    const insertId = result.insertId;

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
      payment_method: finalPaymentMethod,
      payment_status: finalPaymentStatus,
      order_status: finalOrderStatus,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error creating sale:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
