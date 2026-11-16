const pool = require('./db');

async function migrate() {
  console.log('🔄 Starting migration for local db_kita...');

  try {
    // 1. ALTER tbl_produk
    console.log('👉 Updating tbl_produk columns...');
    await pool.query(`
      ALTER TABLE tbl_produk
        ADD COLUMN IF NOT EXISTS sku VARCHAR(50) NULL AFTER stok,
        ADD COLUMN IF NOT EXISTS barcode VARCHAR(50) NULL AFTER sku,
        ADD COLUMN IF NOT EXISTS store_id INT NULL AFTER barcode,
        ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2) DEFAULT 0 AFTER store_id,
        ADD COLUMN IF NOT EXISTS low_stock_threshold INT DEFAULT 5 AFTER cost,
        ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Pcs' AFTER low_stock_threshold,
        ADD COLUMN IF NOT EXISTS image_url TEXT NULL AFTER unit,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER image_url
    `);

    // 2. ALTER tbl_transaksi
    console.log('👉 Updating tbl_transaksi columns...');
    await pool.query(`
      ALTER TABLE tbl_transaksi
        ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) NULL AFTER total_belanja,
        ADD COLUMN IF NOT EXISTS store_id INT NULL AFTER invoice_number,
        ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100) NULL AFTER store_id,
        ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0 AFTER customer_name,
        ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0 AFTER subtotal,
        ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0 AFTER tax_amount,
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash' AFTER discount_amount,
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid' AFTER payment_method,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER payment_status
    `);

    // 3. ALTER tbl_detail_transaksi
    console.log('👉 Updating tbl_detail_transaksi columns...');
    await pool.query(`
      ALTER TABLE tbl_detail_transaksi
        ADD COLUMN IF NOT EXISTS product_name VARCHAR(100) NULL AFTER subtotal,
        ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) DEFAULT 0 AFTER product_name
    `);

    // 4. Update data defaults
    console.log('👉 Populating default values for existing records...');
    await pool.query("UPDATE tbl_produk SET sku = CONCAT('SKU-', LPAD(id_produk, 3, '0')) WHERE sku IS NULL");
    await pool.query("UPDATE tbl_produk SET cost = ROUND(harga * 0.7, 2) WHERE cost = 0 OR cost IS NULL");
    await pool.query("UPDATE tbl_produk SET store_id = 1 WHERE store_id IS NULL");
    
    await pool.query("UPDATE tbl_transaksi SET store_id = 1 WHERE store_id IS NULL");
    await pool.query("UPDATE tbl_transaksi SET invoice_number = CONCAT('INV-', LPAD(id_transaksi, 6, '0')) WHERE invoice_number IS NULL");
    await pool.query(`
      UPDATE tbl_transaksi t 
      JOIN tbl_pelanggan p ON t.id_pelanggan = p.id_pelanggan 
      SET t.customer_name = p.nama_pelanggan 
      WHERE t.customer_name IS NULL
    `);
    await pool.query("UPDATE tbl_transaksi SET subtotal = total_belanja WHERE subtotal = 0 OR subtotal IS NULL");
    await pool.query("UPDATE tbl_transaksi SET created_at = TIMESTAMP(tanggal) WHERE created_at IS NULL");
    
    await pool.query(`
      UPDATE tbl_detail_transaksi dt 
      JOIN tbl_produk p ON dt.id_produk = p.id_produk 
      SET dt.product_name = p.nama_produk, dt.unit_price = p.harga 
      WHERE dt.product_name IS NULL
    `);

    console.log('✅ Migration successfully applied to local db_kita!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
