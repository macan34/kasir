-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 16 Nov 2026 pada 07.46
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_kita`
--

DELIMITER $$
--
-- Prosedur
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `CariPelanggan` (IN `p_id` INT)   BEGIN
    SELECT *
    FROM tbl_pelanggan
    WHERE id_pelanggan = p_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `CekTransaksi` (IN `p_id` INT)   BEGIN
    DECLARE jumlah INT;

    SELECT COUNT(*)
    INTO jumlah
    FROM tbl_transaksi
    WHERE id_pelanggan = p_id;

    IF jumlah > 0 THEN
        SELECT 'Pelanggan Memiliki Transaksi'
        AS keterangan;
    ELSE
        SELECT 'Belum Memiliki Transaksi'
        AS keterangan;
    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `HitungPelanggan` (OUT `jumlah` INT)   BEGIN
    SELECT COUNT(*)
    INTO jumlah
    FROM tbl_pelanggan;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `TambahPelanggan` (IN `p_nama` VARCHAR(100), IN `p_kota` VARCHAR(50))   BEGIN
    INSERT INTO tbl_pelanggan
    (nama_pelanggan, kota)
    VALUES
    (p_nama, p_kota);
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `TambahTransaksi` (IN `p_id_pelanggan` INT, IN `p_tanggal` DATE)   BEGIN
    INSERT INTO tbl_transaksi (id_pelanggan, tanggal) 
    VALUES (p_id_pelanggan, p_tanggal);
    
    
    SELECT LAST_INSERT_ID() AS id_transaksi_baru;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `TampilPelanggan` ()   BEGIN
    SELECT * FROM tbl_pelanggan;
END$$

--
-- Fungsi
--
CREATE DEFINER=`root`@`localhost` FUNCTION `HitungDiskon` (`total_belanja` DECIMAL(12,2)) RETURNS DECIMAL(12,2) DETERMINISTIC BEGIN
    DECLARE diskon DECIMAL(12,2);
    
    IF total_belanja >= 500000 THEN
        SET diskon = total_belanja * 0.10; 
    ELSEIF total_belanja >= 250000 THEN
        SET diskon = total_belanja * 0.05; 
    ELSE
        SET diskon = 0;
    END IF;
    
    RETURN diskon;
END$$

CREATE DEFINER=`root`@`localhost` FUNCTION `HitungPajak` (`harga` DECIMAL(12,2)) RETURNS DECIMAL(12,2) DETERMINISTIC NO SQL BEGIN
    RETURN harga * 0.11;
END$$

CREATE DEFINER=`root`@`localhost` FUNCTION `HitungTotal` (`harga` DECIMAL(12,2), `jumlah` INT) RETURNS DECIMAL(12,2) DETERMINISTIC NO SQL BEGIN
    RETURN harga * jumlah;
END$$

CREATE DEFINER=`root`@`localhost` FUNCTION `KategoriBelanja` (`total` DECIMAL(12,2)) RETURNS VARCHAR(30) CHARSET utf8mb4 COLLATE utf8mb4_general_ci DETERMINISTIC NO SQL BEGIN

    RETURN CASE
        WHEN total >= 1000000 THEN 'Pelanggan Gold'
        WHEN total >= 500000 THEN 'Pelanggan Silver'
        ELSE 'Pelanggan Reguler'
    END;

END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `log_pelanggan`
--

CREATE TABLE `log_pelanggan` (
  `id_log` int(11) NOT NULL,
  `aktivitas` varchar(50) DEFAULT NULL,
  `id_pelanggan` int(11) DEFAULT NULL,
  `waktu` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `log_pelanggan`
--

INSERT INTO `log_pelanggan` (`id_log`, `aktivitas`, `id_pelanggan`, `waktu`) VALUES
(1, 'INSERT PELANGGAN', 2, '2026-11-16 01:16:14'),
(2, 'INSERT PELANGGAN', 3, '2026-11-16 01:28:30'),
(3, 'INSERT PELANGGAN', 4, '2026-11-16 01:30:33'),
(4, 'INSERT PELANGGAN', 5, '2026-11-16 01:30:33'),
(5, 'INSERT PELANGGAN', 6, '2026-11-16 01:30:33'),
(6, 'INSERT PELANGGAN', 7, '2026-11-16 01:30:33'),
(7, 'INSERT PELANGGAN', 8, '2026-11-16 01:30:33'),
(8, 'INSERT PELANGGAN', 9, '2026-11-16 01:30:33'),
(9, 'INSERT PELANGGAN', 10, '2026-11-16 01:30:33'),
(10, 'INSERT PELANGGAN', 11, '2026-11-16 01:30:33'),
(11, 'INSERT PELANGGAN', 12, '2026-11-16 01:30:33'),
(12, 'INSERT PELANGGAN', 13, '2026-11-16 01:30:33'),
(14, 'INSERT PELANGGAN', 15, '2026-11-16 01:31:38'),
(15, 'INSERT PELANGGAN', 16, '2026-11-16 04:35:48'),
(16, 'INSERT PELANGGAN', 17, '2026-11-16 04:46:15'),
(17, 'INSERT PELANGGAN', 18, '2026-11-16 04:46:33'),
(18, 'INSERT PELANGGAN', 19, '2026-11-16 05:50:29');

-- --------------------------------------------------------

--
-- Struktur dari tabel `log_perubahan_pelanggan`
--

CREATE TABLE `log_perubahan_pelanggan` (
  `id_log` int(11) NOT NULL,
  `id_pelanggan` int(11) DEFAULT NULL,
  `nama_lama` varchar(100) DEFAULT NULL,
  `nama_baru` varchar(100) DEFAULT NULL,
  `waktu` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `log_perubahan_pelanggan`
--

INSERT INTO `log_perubahan_pelanggan` (`id_log`, `id_pelanggan`, `nama_lama`, `nama_baru`, `waktu`) VALUES
(1, 1, 'Dewi', 'Nama Baru', '2026-11-16 01:31:20');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_cabang`
--

CREATE TABLE `tbl_cabang` (
  `id_cabang` int(11) NOT NULL,
  `nama_cabang` varchar(100) NOT NULL,
  `kota` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_cabang`
--

INSERT INTO `tbl_cabang` (`id_cabang`, `nama_cabang`, `kota`, `created_at`) VALUES
(1, 'Cabang Ponorogo Kota', 'Ponorogo', '2026-11-16 01:30:33'),
(2, 'Cabang Madiun Plaza', 'Madiun', '2026-11-16 01:30:33'),
(3, 'Cabang Surabaya Gubeng', 'Surabaya', '2026-11-16 01:30:33'),
(4, 'Cabang Jakarta Pusat', 'Jakarta', '2026-11-16 01:30:33'),
(5, 'Cabang Solo Paragon', 'Solo', '2026-11-16 01:30:33'),
(6, 'Cabang Jogja Malioboro', 'Yogyakarta', '2026-11-16 01:30:33'),
(7, 'Cabang Malang Town Square', 'Malang', '2026-11-16 01:30:33'),
(8, 'Cabang Bandung Merdeka', 'Bandung', '2026-11-16 01:30:33'),
(9, 'Cabang Semarang Simpang Lima', 'Semarang', '2026-11-16 01:30:33'),
(10, 'Cabang Kediri Town Square', 'Kediri', '2026-11-16 01:30:33');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_detail_transaksi`
--

CREATE TABLE `tbl_detail_transaksi` (
  `id_detail` int(11) NOT NULL,
  `id_transaksi` int(11) NOT NULL,
  `id_produk` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `product_name` varchar(100) DEFAULT NULL,
  `unit_price` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_detail_transaksi`
--

INSERT INTO `tbl_detail_transaksi` (`id_detail`, `id_transaksi`, `id_produk`, `jumlah`, `subtotal`, `product_name`, `unit_price`) VALUES
(1, 1, 1, 1, 2500000.00, 'Smartphone Android', 2500000.00),
(2, 2, 3, 2, 300000.00, 'Kemeja Flanel', 150000.00),
(3, 3, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(4, 4, 6, 3, 135000.00, 'Kopi Susu Literan', 45000.00),
(5, 5, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(6, 6, 8, 2, 360000.00, 'Skincare Set', 180000.00),
(7, 7, 9, 2, 190000.00, 'Buku Pemrograman SQL', 95000.00),
(8, 8, 10, 1, 450000.00, 'Sepatu Running', 450000.00),
(9, 9, 2, 1, 7500000.00, 'Laptop Core i5', 7500000.00),
(10, 10, 5, 1, 220000.00, 'Gamis Modern', 220000.00),
(11, 12, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(12, 12, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(13, 12, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(14, 13, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(15, 13, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(16, 13, 6, 1, 45000.00, 'Kopi Susu Literan', 45000.00),
(17, 14, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(18, 14, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(19, 14, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(20, 15, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(21, 15, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(22, 15, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(23, 16, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(24, 16, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(25, 16, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(26, 17, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(27, 17, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(28, 17, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(29, 18, 4, 2, 500000.00, 'Celana Jeans Pria', 250000.00),
(30, 18, 5, 1, 220000.00, 'Gamis Modern', 220000.00),
(31, 18, 7, 2, 700000.00, 'Blender Kaca', 350000.00),
(32, 19, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(33, 19, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(34, 19, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(35, 20, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(36, 20, 7, 3, 1050000.00, 'Blender Kaca', 350000.00),
(37, 21, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(38, 21, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(39, 21, 4, 3, 750000.00, 'Celana Jeans Pria', 250000.00),
(40, 22, 7, 1, 350000.00, 'Blender Kaca', 350000.00),
(41, 22, 9, 1, 95000.00, 'Buku Pemrograman SQL', 95000.00),
(42, 22, 5, 2, 440000.00, 'Gamis Modern', 220000.00),
(43, 22, 4, 1, 250000.00, 'Celana Jeans Pria', 250000.00),
(44, 22, 3, 1, 150000.00, 'Kemeja Flanel', 150000.00);

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_kategori`
--

CREATE TABLE `tbl_kategori` (
  `id_kategori` int(11) NOT NULL,
  `nama_kategori` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_kategori`
--

INSERT INTO `tbl_kategori` (`id_kategori`, `nama_kategori`) VALUES
(1, 'Elektronik'),
(2, 'Pakaian Pria'),
(3, 'Pakaian Wanita'),
(4, 'Makanan & Minuman'),
(5, 'Peralatan Rumah Tangga'),
(6, 'Kecantikan & Perawatan'),
(7, 'Buku & Alat Tulis'),
(8, 'Olahraga & Outdoor'),
(9, 'Mainan & Hobi'),
(10, 'Otomotif');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_log`
--

CREATE TABLE `tbl_log` (
  `id_log` int(11) NOT NULL,
  `aktivitas` text NOT NULL,
  `waktu` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_log`
--

INSERT INTO `tbl_log` (`id_log`, `aktivitas`, `waktu`) VALUES
(1, 'Menambah data pelanggan Ahmad Fauzi', '2026-11-01 01:00:00'),
(2, 'Menambah data pelanggan Siti Aminah', '2026-11-01 01:30:00'),
(3, 'Membuat kategori produk Elektronik', '2026-11-01 02:00:00'),
(4, 'Menambah stok produk Smartphone Android', '2026-11-02 03:00:00'),
(5, 'Melakukan transaksi baru ID 1', '2026-11-01 04:00:00'),
(6, 'Melakukan transaksi baru ID 2', '2026-11-02 04:15:00'),
(7, 'Melakukan transaksi baru ID 3', '2026-11-03 06:20:00'),
(8, 'Update data pelanggan Budi Santoso', '2026-11-04 07:00:00'),
(9, 'Menambah data produk baru', '2026-11-05 08:45:00'),
(10, 'Sistem backup otomatis berhasil', '2026-11-05 17:00:00'),
(11, 'Update data pelanggan ID: 1 dari nama \"Dewi\" menjadi \"Nama Baru\"', '2026-11-16 01:31:20'),
(12, 'Melakukan transaksi baru ID: 14 senilai Rp 771450', '2026-11-16 02:54:53'),
(13, 'Melakukan transaksi baru ID: 15 senilai Rp 771450', '2026-11-16 03:41:34'),
(14, 'Melakukan transaksi baru ID: 16 senilai Rp 771450', '2026-11-16 03:50:19'),
(15, 'Melakukan transaksi baru ID: 17 senilai Rp 771450', '2026-11-16 04:03:08'),
(16, 'Melakukan transaksi baru ID: 18 senilai Rp 1576200', '2026-11-16 04:05:37'),
(17, 'Melakukan transaksi baru ID: 19 senilai Rp 771450', '2026-11-16 04:10:50'),
(18, 'Melakukan transaksi baru ID: 20 senilai Rp 1270950', '2026-11-16 04:14:14'),
(19, 'Melakukan transaksi baru ID: 21 senilai Rp 1326450', '2026-11-16 04:20:26'),
(20, 'Melakukan transaksi baru ID: 22 senilai Rp 1297850', '2026-11-16 05:50:58');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_pelanggan`
--

CREATE TABLE `tbl_pelanggan` (
  `id_pelanggan` int(11) NOT NULL,
  `nama_pelanggan` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `kota` varchar(100) DEFAULT NULL,
  `member_ref` varchar(100) DEFAULT NULL,
  `is_member` tinyint(1) NOT NULL DEFAULT 0,
  `member_discount` decimal(5,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_pelanggan`
--

INSERT INTO `tbl_pelanggan` (`id_pelanggan`, `nama_pelanggan`, `created_at`, `kota`, `member_ref`, `is_member`, `member_discount`) VALUES
(1, 'Nama Baru', '2026-11-16 01:13:39', 'Ponorogo', NULL, 0, 0.00),
(2, 'Rina', '2026-11-16 01:16:14', 'Ponorogo', NULL, 0, 0.00),
(3, 'Budi Santoso', '2026-11-16 01:28:30', NULL, NULL, 0, 0.00),
(4, 'Ahmad Fauzi', '2026-11-16 01:30:33', 'Ponorogo', NULL, 0, 0.00),
(5, 'Siti Aminah', '2026-11-16 01:30:33', 'Madiun', NULL, 0, 0.00),
(6, 'Budi Santoso', '2026-11-16 01:30:33', 'Surabaya', NULL, 0, 0.00),
(7, 'Dewi Lestari', '2026-11-16 01:30:33', 'Jakarta', NULL, 0, 0.00),
(8, 'Eko Prasetyo', '2026-11-16 01:30:33', 'Solo', NULL, 0, 0.00),
(9, 'Fitri Handayani', '2026-11-16 01:30:33', 'Yogyakarta', NULL, 0, 0.00),
(10, 'Guntur Wicaksono', '2026-11-16 01:30:33', 'Malang', NULL, 0, 0.00),
(11, 'Hesti Rahmawati', '2026-11-16 01:30:33', 'Bandung', NULL, 0, 0.00),
(12, 'Irfan Hakim', '2026-11-16 01:30:33', 'Semarang', NULL, 0, 0.00),
(13, 'Joko Widodo', '2026-11-16 01:30:33', 'Kediri', NULL, 0, 0.00),
(15, 'Pelanggan Permanen', '2026-11-16 01:31:38', NULL, NULL, 0, 0.00),
(16, 'amat ', '2026-11-16 04:35:48', 'ponorogo', NULL, 0, 0.00),
(17, 'qweqwer', '2026-11-16 04:46:15', 'asdwerfwe', NULL, 0, 0.00),
(18, 'asdwaetasa', '2026-11-16 04:46:33', 'sdgfeartwfrsf', NULL, 0, 0.00),
(19, 'sd', '2026-11-16 05:50:29', 'sdf', '0008305215', 1, 10.00);

--
-- Trigger `tbl_pelanggan`
--
DELIMITER $$
CREATE TRIGGER `after_insert_pelanggan` AFTER INSERT ON `tbl_pelanggan` FOR EACH ROW BEGIN

    INSERT INTO log_pelanggan
    (aktivitas, id_pelanggan)
    VALUES
    ('INSERT PELANGGAN', NEW.id_pelanggan);

END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_pelanggan_update` AFTER UPDATE ON `tbl_pelanggan` FOR EACH ROW BEGIN
    INSERT INTO tbl_log (aktivitas, waktu)
    VALUES (CONCAT('Update data pelanggan ID: ', OLD.id_pelanggan, ' dari nama "', OLD.nama_pelanggan, '" menjadi "', NEW.nama_pelanggan, '"'), NOW());
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_update_pelanggan` AFTER UPDATE ON `tbl_pelanggan` FOR EACH ROW BEGIN

    INSERT INTO log_perubahan_pelanggan
    (
        id_pelanggan,
        nama_lama,
        nama_baru
    )
    VALUES
    (
        OLD.id_pelanggan,
        OLD.nama_pelanggan,
        NEW.nama_pelanggan
    );

END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_pos_settings`
--

CREATE TABLE `tbl_pos_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_produk`
--

CREATE TABLE `tbl_produk` (
  `id_produk` int(11) NOT NULL,
  `id_kategori` int(11) NOT NULL,
  `nama_produk` varchar(100) NOT NULL,
  `harga` decimal(10,2) NOT NULL,
  `stok` int(11) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT 0.00,
  `low_stock_threshold` int(11) DEFAULT 5,
  `unit` varchar(20) DEFAULT 'Pcs',
  `image_url` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_produk`
--

INSERT INTO `tbl_produk` (`id_produk`, `id_kategori`, `nama_produk`, `harga`, `stok`, `sku`, `barcode`, `store_id`, `cost`, `low_stock_threshold`, `unit`, `image_url`, `updated_at`) VALUES
(1, 1, 'Smartphone Android', 2500000.00, 15, 'SKU-001', NULL, 1, 1750000.00, 5, 'Pcs', NULL, '2026-11-16 02:24:36'),
(2, 1, 'Laptop Core i5', 7500000.00, 8, 'SKU-002', NULL, 1, 5250000.00, 5, 'Pcs', NULL, '2026-11-16 02:24:36'),
(3, 2, 'Kemeja Flanel', 150000.00, 29, 'SKU-003', NULL, 1, 105000.00, 5, 'Pcs', NULL, '2026-11-16 05:50:58'),
(4, 2, 'Celana Jeans Pria', 250000.00, 13, 'SKU-004', NULL, 1, 175000.00, 5, 'Pcs', NULL, '2026-11-16 05:50:58'),
(5, 3, 'Gamis Modern', 220000.00, 17, 'SKU-005', NULL, 1, 154000.00, 5, 'Pcs', NULL, '2026-11-16 05:50:58'),
(6, 4, 'Kopi Susu Literan', 45000.00, 49, 'SKU-006', NULL, 1, 31500.00, 5, 'Pcs', NULL, '2026-11-16 02:47:46'),
(7, 5, 'Blender Kaca', 350000.00, 1, 'SKU-007', NULL, 1, 245000.00, 5, 'Pcs', NULL, '2026-11-16 05:50:58'),
(8, 6, 'Skincare Set', 180000.00, 25, 'SKU-008', NULL, 1, 126000.00, 5, 'Pcs', NULL, '2026-11-16 02:24:36'),
(9, 7, 'Buku Pemrograman SQL', 95000.00, 30, 'SKU-009', NULL, 1, 66500.00, 5, 'Pcs', NULL, '2026-11-16 05:50:58'),
(10, 8, 'Sepatu Running', 450000.00, 18, 'SKU-010', NULL, 1, 315000.00, 5, 'Pcs', NULL, '2026-11-16 02:24:36'),
(11, 6, 'ftgyjftyh', 80000.00, 7, 'vbjmh', '8998866632287', 8, 56000.00, 5, 'Pcs', NULL, '2026-11-16 06:18:50');

-- --------------------------------------------------------

--
-- Struktur dari tabel `tbl_transaksi`
--

CREATE TABLE `tbl_transaksi` (
  `id_transaksi` int(11) NOT NULL,
  `id_pelanggan` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `total_belanja` decimal(12,2) DEFAULT 0.00,
  `invoice_number` varchar(50) DEFAULT NULL,
  `store_id` int(11) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `tax_amount` decimal(12,2) DEFAULT 0.00,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `payment_method` varchar(20) DEFAULT 'cash',
  `payment_status` varchar(20) DEFAULT 'paid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `tbl_transaksi`
--

INSERT INTO `tbl_transaksi` (`id_transaksi`, `id_pelanggan`, `tanggal`, `total_belanja`, `invoice_number`, `store_id`, `customer_name`, `subtotal`, `tax_amount`, `discount_amount`, `payment_method`, `payment_status`, `created_at`) VALUES
(1, 1, '2026-11-01', 0.00, 'INV-000001', 1, 'Nama Baru', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(2, 2, '2026-11-02', 0.00, 'INV-000002', 1, 'Rina', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(3, 3, '2026-11-03', 0.00, 'INV-000003', 1, 'Budi Santoso', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(4, 4, '2026-11-04', 0.00, 'INV-000004', 1, 'Ahmad Fauzi', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(5, 5, '2026-11-05', 0.00, 'INV-000005', 1, 'Siti Aminah', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(6, 6, '2026-11-06', 0.00, 'INV-000006', 1, 'Budi Santoso', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(7, 7, '2026-11-07', 0.00, 'INV-000007', 1, 'Dewi Lestari', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(8, 8, '2026-11-08', 0.00, 'INV-000008', 1, 'Eko Prasetyo', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(9, 9, '2026-11-09', 0.00, 'INV-000009', 1, 'Fitri Handayani', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(10, 10, '2026-11-10', 0.00, 'INV-000010', 1, 'Guntur Wicaksono', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(11, 1, '2026-11-18', 0.00, 'INV-000011', 1, 'Nama Baru', 0.00, 0.00, 0.00, 'cash', 'paid', '2026-11-16 02:24:36'),
(12, 1, '2026-11-16', 750600.00, 'INV-97250868', 8, NULL, 695000.00, 55600.00, 0.00, 'cash', 'paid', '2026-11-16 02:47:30'),
(13, 1, '2026-11-16', 529200.00, 'INV-97266956', 8, NULL, 490000.00, 39200.00, 0.00, 'transfer', 'paid', '2026-11-16 02:47:46'),
(14, 1, '2026-11-16', 771450.00, 'INV-97693302', 8, NULL, 695000.00, 76450.00, 0.00, 'cash', 'paid', '2026-11-16 02:54:53'),
(15, 1, '2026-11-16', 771450.00, 'INV-00494341', 2, NULL, 695000.00, 76450.00, 0.00, 'cash', 'paid', '2026-11-16 03:41:34'),
(16, 1, '2026-11-16', 771450.00, 'INV-01019672', 8, NULL, 695000.00, 76450.00, 0.00, 'cash', 'paid', '2026-11-16 03:50:19'),
(17, 1, '2026-11-16', 771450.00, 'INV-01788213', 8, NULL, 695000.00, 76450.00, 0.00, 'card', 'paid', '2026-11-16 04:03:08'),
(18, 1, '2026-11-16', 1576200.00, 'INV-01937222', 8, NULL, 1420000.00, 156200.00, 0.00, 'cash', 'paid', '2026-11-16 04:05:37'),
(19, 1, '2026-11-16', 771450.00, 'INV-02250223', 8, NULL, 695000.00, 76450.00, 0.00, 'cash', 'paid', '2026-11-16 04:10:50'),
(20, 1, '2026-11-16', 1270950.00, 'INV-02454200', 8, NULL, 1145000.00, 125950.00, 0.00, 'cash', 'paid', '2026-11-16 04:14:14'),
(21, 1, '2026-11-16', 1326450.00, 'INV-02826906', 8, NULL, 1195000.00, 131450.00, 0.00, 'cash', 'paid', '2026-11-16 04:20:26'),
(22, 19, '2026-11-16', 1297850.00, 'INV-08258277', 8, 'sd', 1285000.00, 141350.00, 128500.00, 'cash', 'paid', '2026-11-16 05:50:58');

--
-- Trigger `tbl_transaksi`
--
DELIMITER $$
CREATE TRIGGER `before_insert_transaksi` BEFORE INSERT ON `tbl_transaksi` FOR EACH ROW BEGIN

    IF NEW.total_belanja < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Total belanja tidak boleh negatif';
    END IF;

END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Stand-in struktur untuk tampilan `v_laporan_penjualan`
-- (Lihat di bawah untuk tampilan aktual)
--
CREATE TABLE `v_laporan_penjualan` (
`id_transaksi` int(11)
,`tanggal` date
,`nama_pelanggan` varchar(100)
,`total_penjualan` decimal(42,2)
);

-- --------------------------------------------------------

--
-- Struktur untuk view `v_laporan_penjualan`
--
DROP TABLE IF EXISTS `v_laporan_penjualan`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_laporan_penjualan`  AS SELECT `t`.`id_transaksi` AS `id_transaksi`, `t`.`tanggal` AS `tanggal`, `p`.`nama_pelanggan` AS `nama_pelanggan`, sum(`dt`.`jumlah` * `pr`.`harga`) AS `total_penjualan` FROM (((`tbl_transaksi` `t` join `tbl_pelanggan` `p` on(`t`.`id_pelanggan` = `p`.`id_pelanggan`)) join `tbl_detail_transaksi` `dt` on(`t`.`id_transaksi` = `dt`.`id_transaksi`)) join `tbl_produk` `pr` on(`dt`.`id_produk` = `pr`.`id_produk`)) GROUP BY `t`.`id_transaksi`, `t`.`tanggal`, `p`.`nama_pelanggan` ;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `log_pelanggan`
--
ALTER TABLE `log_pelanggan`
  ADD PRIMARY KEY (`id_log`);

--
-- Indeks untuk tabel `log_perubahan_pelanggan`
--
ALTER TABLE `log_perubahan_pelanggan`
  ADD PRIMARY KEY (`id_log`);

--
-- Indeks untuk tabel `tbl_cabang`
--
ALTER TABLE `tbl_cabang`
  ADD PRIMARY KEY (`id_cabang`);

--
-- Indeks untuk tabel `tbl_detail_transaksi`
--
ALTER TABLE `tbl_detail_transaksi`
  ADD PRIMARY KEY (`id_detail`),
  ADD KEY `fk_detail_transaksi` (`id_transaksi`),
  ADD KEY `fk_detail_produk` (`id_produk`);

--
-- Indeks untuk tabel `tbl_kategori`
--
ALTER TABLE `tbl_kategori`
  ADD PRIMARY KEY (`id_kategori`);

--
-- Indeks untuk tabel `tbl_log`
--
ALTER TABLE `tbl_log`
  ADD PRIMARY KEY (`id_log`);

--
-- Indeks untuk tabel `tbl_pelanggan`
--
ALTER TABLE `tbl_pelanggan`
  ADD PRIMARY KEY (`id_pelanggan`);

--
-- Indeks untuk tabel `tbl_pos_settings`
--
ALTER TABLE `tbl_pos_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indeks untuk tabel `tbl_produk`
--
ALTER TABLE `tbl_produk`
  ADD PRIMARY KEY (`id_produk`),
  ADD KEY `fk_produk_kategori` (`id_kategori`),
  ADD KEY `idx_nama_produk` (`nama_produk`);

--
-- Indeks untuk tabel `tbl_transaksi`
--
ALTER TABLE `tbl_transaksi`
  ADD PRIMARY KEY (`id_transaksi`),
  ADD KEY `fk_transaksi_pelanggan` (`id_pelanggan`),
  ADD KEY `idx_tanggal_transaksi` (`tanggal`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `log_pelanggan`
--
ALTER TABLE `log_pelanggan`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT untuk tabel `log_perubahan_pelanggan`
--
ALTER TABLE `log_perubahan_pelanggan`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `tbl_cabang`
--
ALTER TABLE `tbl_cabang`
  MODIFY `id_cabang` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `tbl_detail_transaksi`
--
ALTER TABLE `tbl_detail_transaksi`
  MODIFY `id_detail` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT untuk tabel `tbl_kategori`
--
ALTER TABLE `tbl_kategori`
  MODIFY `id_kategori` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT untuk tabel `tbl_log`
--
ALTER TABLE `tbl_log`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT untuk tabel `tbl_pelanggan`
--
ALTER TABLE `tbl_pelanggan`
  MODIFY `id_pelanggan` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT untuk tabel `tbl_produk`
--
ALTER TABLE `tbl_produk`
  MODIFY `id_produk` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT untuk tabel `tbl_transaksi`
--
ALTER TABLE `tbl_transaksi`
  MODIFY `id_transaksi` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `tbl_detail_transaksi`
--
ALTER TABLE `tbl_detail_transaksi`
  ADD CONSTRAINT `fk_detail_produk` FOREIGN KEY (`id_produk`) REFERENCES `tbl_produk` (`id_produk`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_detail_transaksi` FOREIGN KEY (`id_transaksi`) REFERENCES `tbl_transaksi` (`id_transaksi`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `tbl_produk`
--
ALTER TABLE `tbl_produk`
  ADD CONSTRAINT `fk_produk_kategori` FOREIGN KEY (`id_kategori`) REFERENCES `tbl_kategori` (`id_kategori`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `tbl_transaksi`
--
ALTER TABLE `tbl_transaksi`
  ADD CONSTRAINT `fk_transaksi_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `tbl_pelanggan` (`id_pelanggan`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
