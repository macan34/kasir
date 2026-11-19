const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../middleware/auth');
const { createDuitkuInvoice } = require('../duitku');

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
        COALESCE(t.payment_method, 'qris') AS payment_method,
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
        COALESCE(t.payment_method, 'qris') AS payment_method,
        COALESCE(t.payment_status, 'pending') AS payment_status,
        t.order_status,
        t.duitku_payment_url AS payment_url,
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

router.get('/:id/payment-status', requireRole('superadmin', 'cashier', 'customer'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_transaksi AS id, payment_status, order_status,
              duitku_payment_url AS payment_url
       FROM tbl_transaksi
       WHERE id_transaksi = ?${req.user.role === 'customer' ? ' AND created_by_user_id = ?' : ''}`,
      req.user.role === 'customer' ? [req.params.id, req.user.id] : [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ error: 'Gagal memeriksa status pembayaran.' });
  }
});

router.post('/:id/duitku-payment', requireRole('superadmin', 'cashier', 'customer'), async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id_transaksi, created_by_user_id, payment_status, order_status,
              payment_method, total_belanja, customer_name, duitku_merchant_order_id,
              duitku_payment_url, duitku_customer_email
       FROM tbl_transaksi WHERE id_transaksi = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }

    const sale = orders[0];
    if (req.user.role === 'customer' && String(sale.created_by_user_id) !== String(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ error: 'Pesanan ini bukan milik akun Anda.' });
    }
    if (!['qris', 'va', 'card'].includes(sale.payment_method) ||
        !['pending', 'failed'].includes(sale.payment_status) ||
        sale.order_status !== 'awaiting_payment') {
      await connection.rollback();
      return res.status(409).json({ error: 'Pesanan tidak lagi menunggu pembayaran.' });
    }

    if (sale.payment_status === 'pending' && sale.duitku_payment_url) {
      await connection.commit();
      return res.json({
        payment_url: sale.duitku_payment_url,
        payment_method: sale.payment_method,
        payment_status: sale.payment_status,
      });
    }

    const [details] = await connection.query(
      `SELECT dt.id_produk, dt.jumlah, dt.product_name, dt.unit_price
       FROM tbl_detail_transaksi dt WHERE dt.id_transaksi = ?`,
      [sale.id_transaksi]
    );
    if (!details.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Transaksi belum memiliki barang.' });
    }

    const email = String(req.body.email || sale.duitku_customer_email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Alamat email yang valid wajib diisi untuk pembayaran Duitku.' });
    }

    const paymentAmount = Math.round(Number(sale.total_belanja));
    if (!Number.isSafeInteger(paymentAmount) || paymentAmount < 1) {
      await connection.rollback();
      return res.status(400).json({ error: 'Total pembayaran tidak valid.' });
    }

    const merchantOrderId = `R${Date.now().toString(36)}${crypto.randomBytes(8).toString('hex')}`;
    await connection.query(
      `UPDATE tbl_transaksi
       SET duitku_merchant_order_id = ?, duitku_customer_email = ?,
           duitku_reference = NULL, duitku_payment_url = NULL,
           duitku_va_number = NULL, duitku_qr_string = NULL, payment_status = 'pending'
       WHERE id_transaksi = ?`,
      [merchantOrderId, email, sale.id_transaksi]
    );
    await connection.commit();

    const invoice = await createDuitkuInvoice({
      merchantOrderId,
      amount: paymentAmount,
      paymentMethod: sale.payment_method,
      productDetails: `Pembayaran ${sale.id_transaksi}`,
      customerName: sale.customer_name || req.user.name || 'Pelanggan',
      email,
      phoneNumber: req.body.phone_number,
      items: [{
        product_name: `Total pesanan ${sale.id_transaksi} (termasuk pajak dan diskon)`,
        unit_price: paymentAmount,
        quantity: 1,
      }],
    });

    await pool.query(
      `UPDATE tbl_transaksi
       SET duitku_reference = ?, duitku_payment_url = ?, duitku_va_number = ?, duitku_qr_string = ?
       WHERE id_transaksi = ? AND duitku_merchant_order_id = ?`,
      [invoice.reference, invoice.payment_url, invoice.va_number, invoice.qr_string, sale.id_transaksi, merchantOrderId]
    );
    res.json({
      payment_url: invoice.payment_url,
      payment_method: sale.payment_method,
      payment_status: 'pending',
      va_number: invoice.va_number,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error creating Duitku payment:', err);
    res.status(502).json({ error: err.message || 'Gagal membuat pembayaran Duitku.' });
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
    const validPaymentMethods = isCustomerOrder ? ['qris', 'va'] : ['cash', 'card', 'qris', 'va'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
    }
    const requiresDuitku = ['qris', 'va', 'card'].includes(payment_method);
    const finalPaymentStatus = isCustomerOrder || requiresDuitku ? 'pending' : 'paid';
    const finalOrderStatus = isCustomerOrder || requiresDuitku ? 'awaiting_payment' : 'approved';
    const finalPaymentMethod = payment_method;

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
