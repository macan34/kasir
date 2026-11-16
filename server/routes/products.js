const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper to check which columns exist in tbl_produk
let columnsChecked = false;
let hasCustomColumns = false;

async function checkColumns() {
  if (columnsChecked) return hasCustomColumns;
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_produk' AND COLUMN_NAME = 'sku'"
    );
    hasCustomColumns = cols.length > 0;
    columnsChecked = true;
  } catch (e) {
    hasCustomColumns = false;
  }
  return hasCustomColumns;
}

async function isBarcodeAvailable(barcode, productId) {
  if (!barcode) return true;
  const query = productId
    ? 'SELECT id_produk FROM tbl_produk WHERE barcode = ? AND id_produk <> ? LIMIT 1'
    : 'SELECT id_produk FROM tbl_produk WHERE barcode = ? LIMIT 1';
  const params = productId ? [barcode, productId] : [barcode];
  const [rows] = await pool.query(query, params);
  return rows.length === 0;
}

// GET /api/products - List all products with category info
router.get('/', async (req, res) => {
  try {
    const hasExtras = await checkColumns();

    let query = '';
    if (hasExtras) {
      query = `
        SELECT 
          p.id_produk AS id,
          p.nama_produk AS name,
          COALESCE(p.sku, CONCAT('SKU-', LPAD(p.id_produk, 3, '0'))) AS sku,
          p.barcode,
          p.id_kategori AS category_id,
          p.store_id,
          p.harga AS price,
          COALESCE(p.cost, ROUND(p.harga * 0.7, 2)) AS cost,
          p.stok AS stock_quantity,
          COALESCE(p.low_stock_threshold, 5) AS low_stock_threshold,
          COALESCE(p.unit, 'Pcs') AS unit,
          p.image_url,
          COALESCE(p.updated_at, NOW()) AS created_at,
          COALESCE(p.updated_at, NOW()) AS updated_at,
          k.id_kategori AS cat_id,
          k.nama_kategori AS cat_name
        FROM tbl_produk p
        LEFT JOIN tbl_kategori k ON p.id_kategori = k.id_kategori
        ORDER BY p.nama_produk
      `;
    } else {
      // Fallback if migration not executed yet
      query = `
        SELECT 
          p.id_produk AS id,
          p.nama_produk AS name,
          CONCAT('SKU-', LPAD(p.id_produk, 3, '0')) AS sku,
          NULL AS barcode,
          p.id_kategori AS category_id,
          1 AS store_id,
          p.harga AS price,
          ROUND(p.harga * 0.7, 2) AS cost,
          p.stok AS stock_quantity,
          5 AS low_stock_threshold,
          'Pcs' AS unit,
          NULL AS image_url,
          NOW() AS created_at,
          NOW() AS updated_at,
          k.id_kategori AS cat_id,
          k.nama_kategori AS cat_name
        FROM tbl_produk p
        LEFT JOIN tbl_kategori k ON p.id_kategori = k.id_kategori
        ORDER BY p.nama_produk
      `;
    }

    const [rows] = await pool.query(query);

    const products = rows.map(row => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode || null,
      category_id: row.category_id,
      store_id: row.store_id || null,
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      stock_quantity: parseInt(row.stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(row.low_stock_threshold, 10) || 5,
      unit: row.unit || 'Pcs',
      image_url: row.image_url || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      categories: row.cat_id ? {
        id: row.cat_id,
        name: row.cat_name,
        description: null,
        created_at: new Date().toISOString(),
      } : null,
    }));

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products - Create a product
router.post('/', async (req, res) => {
  try {
    const { name, sku, barcode, category_id, store_id, price, cost, stock_quantity, low_stock_threshold, unit, image_url } = req.body;
    const hasExtras = await checkColumns();
    const normalizedBarcode = String(barcode || '').trim() || null;

    if (hasExtras && !(await isBarcodeAvailable(normalizedBarcode))) {
      return res.status(409).json({ error: 'Barcode ini sudah dipakai produk lain.' });
    }

    let insertId;
    if (hasExtras) {
      const [result] = await pool.query(
        `INSERT INTO tbl_produk (nama_produk, sku, barcode, id_kategori, store_id, harga, cost, stok, low_stock_threshold, unit, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, sku, normalizedBarcode, category_id || null, store_id || null, price, cost || (price * 0.7), stock_quantity, low_stock_threshold || 5, unit || 'Pcs', image_url || null]
      );
      insertId = result.insertId;
    } else {
      const [result] = await pool.query(
        `INSERT INTO tbl_produk (nama_produk, id_kategori, harga, stok) 
         VALUES (?, ?, ?, ?)`,
        [name, category_id || 1, price, stock_quantity]
      );
      insertId = result.insertId;
    }

    res.json({
      id: insertId,
      name,
      sku: sku || `SKU-${String(insertId).padStart(3, '0')}`,
      barcode: normalizedBarcode,
      category_id: category_id || null,
      store_id: store_id || null,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || (parseFloat(price) * 0.7) || 0,
      stock_quantity: parseInt(stock_quantity, 10) || 0,
      low_stock_threshold: parseInt(low_stock_threshold, 10) || 5,
      unit: unit || 'Pcs',
      image_url: image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, barcode, category_id, store_id, price, cost, stock_quantity, low_stock_threshold, unit, image_url } = req.body;
    const hasExtras = await checkColumns();
    const normalizedBarcode = String(barcode || '').trim() || null;

    if (hasExtras && !(await isBarcodeAvailable(normalizedBarcode, id))) {
      return res.status(409).json({ error: 'Barcode ini sudah dipakai produk lain.' });
    }

    if (hasExtras) {
      await pool.query(
        `UPDATE tbl_produk SET 
          nama_produk = ?, sku = ?, barcode = ?, id_kategori = ?, store_id = ?,
          harga = ?, cost = ?, stok = ?, low_stock_threshold = ?, unit = ?, image_url = ?,
          updated_at = NOW()
         WHERE id_produk = ?`,
        [name, sku, normalizedBarcode, category_id || null, store_id || null, price, cost, stock_quantity, low_stock_threshold, unit, image_url || null, id]
      );
    } else {
      await pool.query(
        `UPDATE tbl_produk SET 
          nama_produk = ?, id_kategori = ?, harga = ?, stok = ?
         WHERE id_produk = ?`,
        [name, category_id || 1, price, stock_quantity, id]
      );
    }

    res.json({ id: parseInt(id, 10), name, sku, barcode: normalizedBarcode, category_id, store_id, price, cost, stock_quantity, low_stock_threshold, unit, image_url, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id/stock - Update stock quantity only
router.put('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    const hasExtras = await checkColumns();
    if (hasExtras) {
      await pool.query(
        'UPDATE tbl_produk SET stok = ?, updated_at = NOW() WHERE id_produk = ?',
        [stock_quantity, id]
      );
    } else {
      await pool.query(
        'UPDATE tbl_produk SET stok = ? WHERE id_produk = ?',
        [stock_quantity, id]
      );
    }

    res.json({ id: parseInt(id, 10), stock_quantity, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tbl_produk WHERE id_produk = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
