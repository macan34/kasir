-- =====================================================
-- Migration: Add POS columns to existing db_kita tables
-- Run this AFTER the original db_kita.sql has been imported
-- Compatible with MariaDB 10.4+
-- =====================================================

-- =====================================================
-- 1. ALTER tbl_produk - Add POS columns
-- =====================================================

ALTER TABLE `tbl_produk`
  ADD COLUMN IF NOT EXISTS `sku` VARCHAR(50) NULL AFTER `stok`,
  ADD COLUMN IF NOT EXISTS `barcode` VARCHAR(50) NULL AFTER `sku`,
  ADD COLUMN IF NOT EXISTS `store_id` INT NULL AFTER `barcode`,
  ADD COLUMN IF NOT EXISTS `cost` DECIMAL(12,2) DEFAULT 0 AFTER `store_id`,
  ADD COLUMN IF NOT EXISTS `low_stock_threshold` INT DEFAULT 5 AFTER `cost`,
  ADD COLUMN IF NOT EXISTS `unit` VARCHAR(20) DEFAULT 'Pcs' AFTER `low_stock_threshold`,
  ADD COLUMN IF NOT EXISTS `image_url` TEXT NULL AFTER `unit`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `image_url`;

-- Add unique index on sku (only if not exists)
-- MariaDB doesn't support IF NOT EXISTS for indexes directly, so we use a procedure
DELIMITER $$
DROP PROCEDURE IF EXISTS `add_sku_index`$$
CREATE PROCEDURE `add_sku_index`()
BEGIN
  DECLARE idx_count INT;
  SELECT COUNT(*) INTO idx_count
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_produk'
    AND INDEX_NAME = 'idx_sku_unique';
  IF idx_count = 0 THEN
    ALTER TABLE `tbl_produk` ADD UNIQUE INDEX `idx_sku_unique` (`sku`);
  END IF;
END$$
DELIMITER ;
CALL `add_sku_index`();
DROP PROCEDURE IF EXISTS `add_sku_index`;

-- Add FK for store_id (only if not exists)
DELIMITER $$
DROP PROCEDURE IF EXISTS `add_produk_store_fk`$$
CREATE PROCEDURE `add_produk_store_fk`()
BEGIN
  DECLARE fk_count INT;
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_produk'
    AND CONSTRAINT_NAME = 'fk_produk_cabang';
  IF fk_count = 0 THEN
    ALTER TABLE `tbl_produk`
      ADD CONSTRAINT `fk_produk_cabang` FOREIGN KEY (`store_id`) REFERENCES `tbl_cabang` (`id_cabang`) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL `add_produk_store_fk`();
DROP PROCEDURE IF EXISTS `add_produk_store_fk`;


-- =====================================================
-- 2. ALTER tbl_transaksi - Add POS columns
-- =====================================================

ALTER TABLE `tbl_transaksi`
  ADD COLUMN IF NOT EXISTS `invoice_number` VARCHAR(50) NULL AFTER `total_belanja`,
  ADD COLUMN IF NOT EXISTS `store_id` INT NULL AFTER `invoice_number`,
  ADD COLUMN IF NOT EXISTS `customer_name` VARCHAR(100) NULL AFTER `store_id`,
  ADD COLUMN IF NOT EXISTS `subtotal` DECIMAL(12,2) DEFAULT 0 AFTER `customer_name`,
  ADD COLUMN IF NOT EXISTS `tax_amount` DECIMAL(12,2) DEFAULT 0 AFTER `subtotal`,
  ADD COLUMN IF NOT EXISTS `discount_amount` DECIMAL(12,2) DEFAULT 0 AFTER `tax_amount`,
  ADD COLUMN IF NOT EXISTS `payment_method` VARCHAR(20) DEFAULT 'cash' AFTER `discount_amount`,
  ADD COLUMN IF NOT EXISTS `payment_status` VARCHAR(20) DEFAULT 'paid' AFTER `payment_method`,
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `payment_status`,
  ADD COLUMN IF NOT EXISTS `order_status` VARCHAR(24) NOT NULL DEFAULT 'approved' AFTER `created_at`,
  ADD COLUMN IF NOT EXISTS `created_by_user_id` BIGINT UNSIGNED NULL AFTER `order_status`,
  ADD COLUMN IF NOT EXISTS `approved_by_user_id` BIGINT UNSIGNED NULL AFTER `created_by_user_id`,
  ADD COLUMN IF NOT EXISTS `approved_at` TIMESTAMP NULL DEFAULT NULL AFTER `approved_by_user_id`;

-- Add FK for store_id on transaksi
DELIMITER $$
DROP PROCEDURE IF EXISTS `add_transaksi_store_fk`$$
CREATE PROCEDURE `add_transaksi_store_fk`()
BEGIN
  DECLARE fk_count INT;
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tbl_transaksi'
    AND CONSTRAINT_NAME = 'fk_transaksi_cabang';
  IF fk_count = 0 THEN
    ALTER TABLE `tbl_transaksi`
      ADD CONSTRAINT `fk_transaksi_cabang` FOREIGN KEY (`store_id`) REFERENCES `tbl_cabang` (`id_cabang`) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL `add_transaksi_store_fk`();
DROP PROCEDURE IF EXISTS `add_transaksi_store_fk`;


-- =====================================================
-- 3. ALTER tbl_detail_transaksi - Add POS columns
-- =====================================================

ALTER TABLE `tbl_detail_transaksi`
  ADD COLUMN IF NOT EXISTS `product_name` VARCHAR(100) NULL AFTER `subtotal`,
  ADD COLUMN IF NOT EXISTS `unit_price` DECIMAL(12,2) DEFAULT 0 AFTER `product_name`;


-- =====================================================
-- 4. UPDATE existing rows with default values
-- =====================================================

-- Generate SKU values for existing products based on id_produk
UPDATE `tbl_produk`
SET `sku` = CONCAT('SKU-', LPAD(id_produk, 3, '0'))
WHERE `sku` IS NULL;

-- Set cost to 70% of selling price
UPDATE `tbl_produk`
SET `cost` = ROUND(harga * 0.7, 2)
WHERE `cost` = 0 OR `cost` IS NULL;

-- Set store_id to first cabang (id_cabang = 1)
UPDATE `tbl_produk`
SET `store_id` = 1
WHERE `store_id` IS NULL;

-- Set default values for transaksi
UPDATE `tbl_transaksi`
SET `store_id` = 1
WHERE `store_id` IS NULL;

-- Set invoice_number for existing transactions
UPDATE `tbl_transaksi`
SET `invoice_number` = CONCAT('INV-', LPAD(id_transaksi, 6, '0'))
WHERE `invoice_number` IS NULL;

-- Set customer_name from tbl_pelanggan
UPDATE `tbl_transaksi` t
JOIN `tbl_pelanggan` p ON t.id_pelanggan = p.id_pelanggan
SET t.customer_name = p.nama_pelanggan
WHERE t.customer_name IS NULL;

-- Set subtotal from total_belanja (or from detail sum)
UPDATE `tbl_transaksi` t
SET t.subtotal = (
  SELECT COALESCE(SUM(dt.subtotal), 0)
  FROM tbl_detail_transaksi dt
  WHERE dt.id_transaksi = t.id_transaksi
)
WHERE t.subtotal = 0 OR t.subtotal IS NULL;

-- Update total_belanja to match subtotal if it was 0
UPDATE `tbl_transaksi`
SET `total_belanja` = `subtotal`
WHERE `total_belanja` = 0 AND `subtotal` > 0;

-- Set created_at from tanggal for existing records
UPDATE `tbl_transaksi`
SET `created_at` = TIMESTAMP(`tanggal`)
WHERE `created_at` IS NULL;

-- Fill product_name and unit_price in detail_transaksi
UPDATE `tbl_detail_transaksi` dt
JOIN `tbl_produk` p ON dt.id_produk = p.id_produk
SET dt.product_name = p.nama_produk,
    dt.unit_price = p.harga
WHERE dt.product_name IS NULL;

-- =====================================================
-- Done! All POS columns have been added and populated.
-- =====================================================
