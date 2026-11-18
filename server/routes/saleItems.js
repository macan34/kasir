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
router.post('/', requireRole('superadmin', 'cashier', 'customer'), async (req, res) => {
  let connection;
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    const saleId = items[0]?.sale_id;
    if (!saleId || items.some(item =>
      String(item.sale_id) !== String(saleId) ||
      !Number.isSafeInteger(Number(item.product_id)) ||
      Number(item.product_id) < 1 ||
      !Number.isSafeInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
    )) {
      return res.status(400).json({ error: 'Data produk atau transaksi tidak valid.' });
    }

    const hasExtras = await checkColumns();
    const quantities = new Map();
    for (const item of items) {
      const productId = Number(item.product_id);
      quantities.set(productId, (quantities.get(productId) || 0) + Number(item.quantity));
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [sales] = await connection.query(
      `SELECT id_transaksi, created_by_user_id, payment_status, order_status
       FROM tbl_transaksi WHERE id_transaksi = ? LIMIT 1 FOR UPDATE`,
      [saleId]
    );
    if (!sales.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    }
    const sale = sales[0];
    if (String(sale.created_by_user_id) !== String(req.user.id)) {
      await connection.rollback();
      return res.status(403).json({ error: 'Anda tidak dapat mengubah pesanan milik akun lain.' });
    }
    const isCustomerOrder = req.user.role === 'customer';
    const expectedOrderStatus = isCustomerOrder ? 'awaiting_payment' : 'approved';
    const expectedPaymentStatus = isCustomerOrder ? 'pending' : 'paid';
    if (sale.order_status !== expectedOrderStatus || sale.payment_status !== expectedPaymentStatus) {
      await connection.rollback();
      return res.status(409).json({ error: 'Pesanan tidak dapat diubah pada status saat ini.' });
    }
    const [existingItems] = await connection.query(
      'SELECT id_detail FROM tbl_detail_transaksi WHERE id_transaksi = ? LIMIT 1 FOR UPDATE',
      [saleId]
    );
    if (existingItems.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Rincian untuk pesanan ini sudah pernah disimpan.' });
    }

    const products = new Map();
    for (const [productId, quantity] of quantities) {
      const [rows] = await connection.query(
        'SELECT id_produk, nama_produk, harga, stok FROM tbl_produk WHERE id_produk = ? FOR UPDATE',
        [productId]
      );
      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({ error: `Produk ${productId} tidak ditemukan.` });
      }
      if (Number(rows[0].stok) < quantity) {
        await connection.rollback();
        return res.status(409).json({ error: `Stok ${rows[0].nama_produk} tidak mencukupi.` });
      }
      products.set(productId, rows[0]);
    }

    const values = items.map(item => {
      const product = products.get(Number(item.product_id));
      const quantity = Number(item.quantity);
      const unitPrice = Number(product.harga);
      return [
        saleId,
        Number(item.product_id),
        quantity,
        unitPrice * quantity,
        product.nama_produk,
        unitPrice,
      ];
    });
    if (hasExtras) {
      await connection.query(
        `INSERT INTO tbl_detail_transaksi (id_transaksi, id_produk, jumlah, subtotal, product_name, unit_price) 
         VALUES ?`,
        [values]
      );
    } else {
      await connection.query(
        `INSERT INTO tbl_detail_transaksi (id_transaksi, id_produk, jumlah, subtotal) 
         VALUES ?`,
        [values.map(([id, productId, quantity, lineTotal]) => [id, productId, quantity, lineTotal])]
      );
    }

    if (isCustomerOrder) {
      const verifiedSubtotal = values.reduce((sum, item) => sum + item[3], 0);
      const verifiedTax = Math.round(verifiedSubtotal * 0.11);
      await connection.query(
        `UPDATE tbl_transaksi
         SET subtotal = ?, tax_amount = ?, discount_amount = 0, total_belanja = ?,
             payment_method = 'qris_dummy'
         WHERE id_transaksi = ?`,
        [verifiedSubtotal, verifiedTax, verifiedSubtotal + verifiedTax, saleId]
      );
    } else {
      for (const [productId, quantity] of quantities) {
        await connection.query(
          'UPDATE tbl_produk SET stok = stok - ? WHERE id_produk = ?',
          [quantity, productId]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, count: items.length });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error creating sale items:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
