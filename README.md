# Retaillet POS

Aplikasi kasir dan inventaris berbasis React, Vite, Express, dan MySQL/MariaDB. Data produk, pelanggan, stok, dan transaksi disimpan di database lokal.

## Daftar isi

- [Fitur](#fitur)
- [Persyaratan](#persyaratan)
- [Instalasi pertama kali](#instalasi-pertama-kali)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Panduan penggunaan](#panduan-penggunaan)
- [Perangkat scanner dan printer](#perangkat-scanner-dan-printer)
- [Pemeliharaan database](#pemeliharaan-database)
- [Pemecahan masalah](#pemecahan-masalah)
- [Catatan keamanan dan batasan](#catatan-keamanan-dan-batasan)

## Fitur

- **Dashboard** membaca transaksi, produk, stok, pelanggan, dan cabang langsung dari database. Nilai retur/pembelian/pengeluaran tidak ditampilkan karena tabel sumbernya belum tersedia di skema database saat ini.
- **Kasir POS** untuk mencari produk, memindai SKU/barcode, mengatur jumlah barang, menerapkan diskon, memilih metode pembayaran, dan menyimpan transaksi.
- **Produk** untuk menambah, mengubah, mencari, dan menghapus produk beserta SKU, barcode, harga, biaya, stok, satuan, dan kategori.
- **Label barcode** untuk mencetak label produk dalam format CODE128.
- **Pelanggan dan kartu member** dengan kode REF kartu, diskon khusus pelanggan, serta diskon default yang dapat diatur admin.
- **Riwayat transaksi** untuk mencari transaksi dan mencetak ulang nota.
- **Manajemen stok** untuk menambah, mengurangi, atau menetapkan stok fisik serta mencatat alasan penyesuaian.
- **Kategori** untuk menambah, mengubah, dan menghapus kategori produk.
- **Log aktivitas** untuk melihat log sistem dan perubahan nama pelanggan yang dicatat database.
- **Outlet/cabang** dapat dipilih melalui pemilih lokasi di header bila data outlet tersedia. Nota menggunakan nama **RETAILED POSS** dan tidak mencetak alamat/cabang.
- **Login berbasis akun** dengan peran Super Admin, kasir, dan pelanggan. Pelanggan dapat melihat produk, membuat pesanan, lalu menyelesaikan simulasi QRIS dummy sebelum pesanan muncul untuk persetujuan kasir/Super Admin.
- **Persetujuan pesanan** menampilkan pesanan pelanggan yang sudah dibayar; kasir atau Super Admin dapat melihat rincian dan menyetujui pesanan. QRIS pada aplikasi ini hanya simulasi lokal dan tidak memproses uang sungguhan.
- **Super Admin** dapat membuat, mengubah, menonaktifkan, dan menghapus akun kasir/pelanggan serta mengelola data pelanggan/member.
- **Kasir dibatasi ke layanan pembelian:** setelah login langsung membuka POS, dengan akses ke POS dan riwayat transaksi saja. Kasir tidak dapat menambah/mengubah/menghapus produk atau kategori, mengelola stok, maupun membuka fitur cetak barcode.

## Persyaratan

- Windows 10/11.
- Node.js **20.19+** atau **22.12+** beserta npm.
- MySQL atau MariaDB lokal. Dump database disiapkan untuk MariaDB 10.4; gunakan akun database yang memiliki izin membuat/mengubah tabel, indeks, prosedur, dan trigger.
- Browser modern seperti Chrome atau Microsoft Edge.
- Scanner barcode/member yang berfungsi sebagai keyboard USB/HID untuk alur pemindaian yang didukung aplikasi.

## Instalasi pertama kali

### 1. Siapkan database

Jalankan layanan MySQL/MariaDB, lalu buat database `db_kita`. Impor dump dasar hanya saat menyiapkan database baru. **Cadangkan database terlebih dahulu** sebelum menjalankan impor atau migrasi pada database yang sudah berisi data.

Contoh memakai Command Prompt (`cmd.exe`) dari folder utama proyek:

```bat
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS db_kita CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p db_kita < database\db_kita.sql
mysql -u root -p db_kita < database\migration_add_pos_columns.sql
```

Masukkan kata sandi MySQL saat diminta. Jika menggunakan phpMyAdmin, buat/pilih database `db_kita`, impor `database/db_kita.sql`, lalu jalankan `database/migration_add_pos_columns.sql` pada database tersebut.

Backend membuat tabel akun, kolom member, dan tabel pengaturan kartu member secara otomatis saat pertama kali dijalankan. Skrip `database/migration_member_cards.sql` tersedia jika perlu menjalankan perubahan member secara manual.

### 2. Atur koneksi database

Buat atau perbarui file `.env` di folder utama proyek. Jangan bagikan atau commit file ini karena berisi kredensial database.

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ganti_dengan_kata_sandi_mysql
DB_NAME=db_kita
PORT=3001
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=ganti_dengan_password_kuat_minimal_8_karakter
```

Pilih username dan password Super Admin sendiri; jangan gunakan contoh password di atas. Akun Super Admin pertama dibuat hanya bila belum ada akun Super Admin. Simpan `.env` dengan aman dan jangan commit ke Git. Jika akun MySQL tidak memiliki kata sandi, kosongkan `DB_PASSWORD`. Saat menjalankan perintah dari folder utama proyek, backend membaca `.env` dari folder tersebut. Backend dan konfigurasi proxy Vite sama-sama mengharapkan API di port `3001`; jika port ini diubah, sesuaikan juga target proxy di `vite.config.ts`.

### 3. Pasang dependensi

Jalankan dari folder utama proyek:

```bash
npm install
npm install --prefix server
```

## Menjalankan aplikasi

Dari folder utama proyek, jalankan:

```bash
npm run dev
```

Perintah ini menjalankan backend API dan frontend Vite sekaligus. Buka alamat frontend yang tercetak di terminal, biasanya:

```text
http://localhost:5173
```

Jika port tersebut sedang dipakai, Vite dapat memilih port berikutnya, misalnya `5174`; gunakan alamat yang tercetak di terminal. API berjalan pada port `3001`. Periksa koneksi backend dan database melalui:

```text
http://localhost:3001/api/health
```

Respons sehat berisi status `ok` dan database `connected`. Hentikan kedua server dengan `Ctrl+C` pada terminal yang menjalankan `npm run dev`.

Perintah tambahan:

```bash
npm run server       # hanya backend
npm run dev:vite     # hanya frontend
npm run typecheck    # pemeriksaan TypeScript
npm run build        # build produksi frontend
npm run preview      # pratinjau build setelah npm run build
```

## Panduan penggunaan

### Menyiapkan produk

1. Buka **Products** atau **Create Product**.
2. Pilih **Add Product** dan isi nama produk serta SKU. SKU wajib diisi dan menjadi kode alternatif untuk pencarian/pemindaian.
3. Isi harga, biaya, stok awal, satuan, kategori, dan barcode bila tersedia.
4. Untuk scanner keyboard, klik kolom barcode lalu scan. Simpan produk setelah datanya lengkap.
5. Barcode harus unik. Produk tanpa barcode tetap dapat ditemukan dan dicetak menggunakan SKU.

### Mencetak label barcode

1. Buka **Products → Cetak Label**, atau pilih **Print Barcode** pada menu Inventory.
2. Secara default, semua produk yang berhasil dimuat dipilih dengan satu label per produk.
3. Ubah jumlah label, batalkan pilihan produk tertentu, atau gunakan **Pilih semua/Hapus pilihan**.
4. Tekan **Cetak Label**. Jika browser memblokir jendela cetak, izinkan pop-up untuk aplikasi ini lalu coba lagi.
5. Di dialog cetak, gunakan kertas A4 portrait dan skala 100% sebagai pengaturan awal. Halaman menyusun label dalam tiga kolom; sesuaikan ukuran kertas, margin, dan printer jika memakai lembar label khusus.

Barcode label menggunakan nilai barcode produk; jika kosong, label menggunakan SKU. Format barcode adalah CODE128.

### Menjual barang di kasir

1. Buka **Kasir POS** dan pilih/kategorikan produk atau gunakan pencarian.
2. Tambahkan produk dengan mengklik produk, atau scan barcode/SKU pada kolom pemindai kasir. Scanner sebaiknya dikonfigurasi untuk mengirim tombol **Enter** setelah kode.
3. Pastikan jumlah barang sesuai. Stok habis atau jumlah melebihi stok tidak dapat dijual.
4. Untuk pelanggan umum, lanjutkan ke **Bayar / Checkout**. Untuk member, scan kode kartu pada kolom kartu member terlebih dahulu.
5. Tinjau diskon dan total, pilih metode pembayaran yang tersedia. Untuk pembayaran tunai, masukkan jumlah uang yang diterima; transaksi tunai tidak dapat diselesaikan jika uang kurang dari total.
6. Selesaikan transaksi. Nota dapat dicetak dari dialog transaksi atau dicetak kembali dari **Riwayat Transaksi**.

POS menghitung PPN 11%. Diskon manual dan diskon member mengurangi subtotal; diskon member mengikuti diskon khusus pelanggan jika diatur, atau diskon default admin jika diskon khusus bernilai 0.

### Akses pelanggan

1. Super Admin membuat akun pelanggan pada **Super Admin & Logs → Akun Pengguna**.
2. Pada halaman sambutan, pilih **Belanja sebagai pelanggan** dan masuk menggunakan username/password yang diberikan.
3. Cari produk, pilih jumlahnya, lalu tekan **Buat Pesanan**.
4. Pesanan tercatat dengan status menunggu pembayaran dan dibayar di toko saat pengambilan. Stok berkurang saat pesanan dibuat.

### Mengelola akun dan pelanggan

1. Masuk sebagai Super Admin menggunakan akun bootstrap yang diatur melalui `BOOTSTRAP_ADMIN_USERNAME` dan `BOOTSTRAP_ADMIN_PASSWORD`.
2. Buka **Super Admin & Logs → Akun Pengguna** untuk membuat akun kasir/pelanggan, mengubah nama/username/peran, mengatur ulang password, menonaktifkan, atau menghapus akun.
3. Buka **Data Pelanggan** pada halaman yang sama untuk menambah, mengedit, atau menghapus data pelanggan dan pengaturan member.
4. Akun Super Admin utama tidak dapat diubah atau dihapus dari daftar akun.

Untuk mengisi database baru dengan akun awal, jalankan `npm run seed:users` dari folder proyek. Seeder membuat akun `admin`, `kasir`, dan `pelanggan` yang belum tersedia, memberi password acak kuat, serta menampilkan password hanya saat akun baru dibuat. Simpan password dari output terminal dengan aman. Seeder dapat dijalankan ulang tanpa mengganti password akun yang sudah ada.

### Menggunakan kartu member

1. Buka **Pelanggan** lalu **Tambah Pelanggan**.
2. Isi nama, lalu aktifkan **Aktifkan member**.
3. Scan/tap kartu pada kolom kode kartu member atau masukkan kodenya secara manual. Kode yang disimpan di kolom REF harus sama dengan kode yang dikirim reader.
4. Masukkan diskon khusus pelanggan jika diperlukan. Nilai 0% berarti menggunakan diskon member default.
5. Atur **Diskon Member Default (Admin)** di halaman Pelanggan dan tekan **Simpan Setting**.
6. Saat transaksi POS, scan kode kartu pelanggan yang sudah aktif. Nama pelanggan akan dipilih dan diskon yang berlaku ditampilkan pada transaksi.

Scanner kartu harus mengirimkan nomor kartu sebagai teks melalui keyboard USB/HID. Pembacaan NFC/PC-SC yang hanya berkomunikasi melalui protokol khusus tidak dibaca langsung oleh browser.

### Mengelola stok

1. Buka **Manage Stock**.
2. Cari produk berdasarkan nama atau SKU lalu pilih **Sesuaikan**.
3. Pilih **Tambah Masuk**, **Kurang Rusak**, atau **Set Fisik**.
4. Masukkan jumlah dan catatan/alasan bila perlu, lalu simpan.
5. Status stok aman, tipis, atau habis mengikuti jumlah stok dan batas stok minimum produk.

### Pelanggan, kategori, dan transaksi

- **Pelanggan:** cari data, tambah/edit/hapus pelanggan, aktifkan kartu member, dan atur diskon.
- **Category:** tambah, ubah, dan hapus kategori yang digunakan produk.
- **Riwayat Transaksi:** cari berdasarkan nomor nota atau nama pelanggan, lalu cetak ulang nota thermal.
- **Super Admin & Logs:** lihat log aktivitas sistem serta perubahan nama pelanggan yang tersedia dari database.
- **Dashboard:** gunakan ringkasan untuk memantau penjualan dan data inventaris.

### Mencetak nota

Nota dicetak melalui jendela cetak terpisah agar isi aplikasi lain tidak ikut tercetak. Judul nota adalah **RETAILED POSS**. Untuk printer thermal, pilih printer yang sesuai (misalnya Epson TM-T82X) dan kertas 80 mm. Browser/printer dapat menampilkan dialog pengaturan cetak sebelum pencetakan.

## Perangkat scanner dan printer

- **Scanner produk:** mode keyboard/HID, arahkan fokus ke kolom scan di POS, dan atur akhiran scan menjadi Enter. Scanner dapat digunakan untuk mengisi kolom barcode saat membuat produk.
- **Scanner kartu member:** harus mengetikkan kode REF ke kolom kartu member; beberapa reader USB NFC bekerja dalam mode keyboard emulation.
- **Printer label:** label standar saat ini disusun untuk A4 portrait. Untuk kertas label dengan ukuran/posisi lem berbeda, atur ukuran kertas, margin, skala, dan lakukan uji cetak terlebih dahulu.
- **Printer nota:** gunakan kertas thermal 80 mm dan pilih printer yang benar di dialog browser.

## Pemeliharaan database

Data aplikasi disimpan di database MySQL/MariaDB lokal. Buat cadangan secara berkala. Contoh dari Command Prompt:

```bat
mysqldump -u root -p db_kita > backup-db_kita.sql
```

Simpan file cadangan di lokasi aman yang bukan folder publik aplikasi. Sebelum migrasi atau perubahan skema, pastikan cadangan terbaru tersedia.

## Pemecahan masalah

| Masalah | Yang perlu diperiksa |
| --- | --- |
| API menampilkan 404 atau `Transaction not found` | Pastikan backend dijalankan dari folder utama dengan `npm run dev`, database tersambung, lalu muat ulang halaman. |
| Gagal konek MySQL / `Access denied` | Pastikan layanan MySQL aktif dan nilai `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, serta `DB_NAME` di `.env` benar. |
| Scanner tidak menambahkan produk | Isi barcode pada produk atau gunakan SKU, fokuskan kolom scan POS, pastikan scanner dalam mode keyboard/HID dan mengirim Enter. |
| Kartu tidak menerapkan diskon | Pastikan pelanggan aktif sebagai member, kode REF sama dengan hasil scan, dan pengaturan diskon sudah disimpan. |
| Jendela cetak label tidak muncul | Izinkan pop-up untuk alamat aplikasi dan tekan tombol cetak kembali. |
| Error `Outdated Optimize Dep` di browser | Hentikan lalu jalankan ulang `npm run dev`; setelah itu muat ulang browser dengan `Ctrl+Shift+R`. |
| Port frontend 5173 sedang digunakan | Gunakan alamat port alternatif yang dicetak Vite di terminal. |

## Catatan keamanan dan batasan

- Password akun disimpan sebagai hash scrypt, bukan teks biasa. Sesi login berlaku 12 jam dan disimpan di memori backend, jadi server restart akan mengakhiri sesi.
- Semua API selain login/status dan pemeriksaan kesehatan mewajibkan sesi login. Perubahan produk, kategori, stok, pelanggan, dan log dibatasi untuk Super Admin; kasir/pelanggan tidak dapat menambah atau menaikkan stok produk.
- Aplikasi ditujukan untuk penggunaan lokal/lingkungan tepercaya. Jangan mengekspos API ke internet tanpa konfigurasi HTTPS, pembatasan asal, perlindungan percobaan login, dan peninjauan keamanan deployment.
- Pilih **Keluar** untuk mengakhiri sesi login.
- Jangan mengekspos port API `3001` ke internet atau meneruskan port melalui router tanpa menambahkan pengamanan yang sesuai.
- Simpan `.env` dan cadangan database dengan aman; jangan memasukkan kata sandi atau data kartu pelanggan ke repositori publik.
- Menu **Print QR Code** saat ini masih membuka halaman label barcode CODE128, bukan generator QR.
- Menu **Stock Transfer** belum memiliki alur transfer antarcabang tersendiri dan saat ini membuka halaman manajemen stok.
- Beberapa menu inventaris lain menggunakan halaman kategori/produk bersama; fitur subkategori, merek, unit, variasi, dan garansi belum memiliki pengelolaan terpisah.