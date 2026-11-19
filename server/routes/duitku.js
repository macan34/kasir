const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const { getDuitkuConfig, getDuitkuPaymentMethod } = require('../duitku');

const router = express.Router();

router.post('/callback', express.urlencoded({ extended: false }), async (req, res) => {
  let connection;
  try {
    const { merchantCode, amount, merchantOrderId, resultCode, reference, signature, paymentCode } = req.body;
    const config = getDuitkuConfig();
    if (!merchantCode || !amount || !merchantOrderId || !signature ||
        !['00', '01'].includes(resultCode) || merchantCode !== config.merchantCode) {
      return res.status(400).json({ error: 'Parameter callback Duitku tidak valid.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.apiKey)
      .update(`${merchantCode}${amount}${merchantOrderId}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedSignature = String(signature).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(receivedSignature)) {
      return res.status(403).json({ error: 'Signature callback Duitku tidak valid.' });
    }
    const receivedBuffer = Buffer.from(receivedSignature);
    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return res.status(403).json({ error: 'Signature callback Duitku tidak valid.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [sales] = await connection.query(
      `SELECT t.id_transaksi, t.total_belanja, t.payment_method, t.payment_status, t.order_status,
              u.role AS creator_role
       FROM tbl_transaksi t
       LEFT JOIN tbl_users u ON u.id = t.created_by_user_id
       WHERE t.duitku_merchant_order_id = ?
       FOR UPDATE`,
      [merchantOrderId]
    );
    if (!sales.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Transaksi Duitku tidak ditemukan.' });
    }

    const sale = sales[0];
    if (Number(amount) !== Math.round(Number(sale.total_belanja))) {
      await connection.rollback();
      return res.status(400).json({ error: 'Nominal callback tidak sesuai dengan transaksi.' });
    }
    if (paymentCode && paymentCode !== getDuitkuPaymentMethod(sale.payment_method)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Metode callback tidak sesuai dengan transaksi.' });
    }

    if (sale.payment_status === 'paid') {
      await connection.commit();
      return res.json({ success: true });
    }
    if (sale.payment_status !== 'pending') {
      await connection.rollback();
      return res.status(409).json({ error: 'Status transaksi sudah tidak menunggu pembayaran.' });
    }

    if (resultCode === '00') {
      const [details] = await connection.query(
        'SELECT id_produk, jumlah FROM tbl_detail_transaksi WHERE id_transaksi = ?',
        [sale.id_transaksi]
      );
      if (!details.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'Transaksi tidak memiliki rincian barang.' });
      }

      const quantities = new Map();
      for (const detail of details) {
        const productId = Number(detail.id_produk);
        quantities.set(productId, (quantities.get(productId) || 0) + Number(detail.jumlah));
      }
      for (const [productId, quantity] of quantities) {
        await connection.query(
          'UPDATE tbl_produk SET stok = stok - ? WHERE id_produk = ?',
          [quantity, productId]
        );
      }

      await connection.query(
        `UPDATE tbl_transaksi
         SET payment_status = 'paid', order_status = ?, duitku_reference = ?
         WHERE id_transaksi = ?`,
        [sale.creator_role === 'customer' ? 'pending_approval' : 'approved', reference || null, sale.id_transaksi]
      );
    } else {
      await connection.query(
        `UPDATE tbl_transaksi SET payment_status = 'failed', duitku_reference = ?
         WHERE id_transaksi = ?`,
        [reference || null, sale.id_transaksi]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error processing Duitku callback:', err);
    res.status(500).json({ error: 'Gagal memproses callback Duitku.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
