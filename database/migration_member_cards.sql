-- Persistent member cards and administrator-configurable default discount.
-- The backend also applies these idempotent changes at startup.

ALTER TABLE `tbl_pelanggan`
  ADD COLUMN IF NOT EXISTS `member_ref` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `is_member` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `member_discount` DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `tbl_pos_settings` (
  `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `setting_value` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
