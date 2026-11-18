require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const crypto = require('crypto');
const pool = require('./db');
const { hashPassword } = require('./auth/passwords');

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

async function seedUsers() {
  const connection = await pool.getConnection();
  const created = [];

  try {
    await connection.beginTransaction();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tbl_users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(32) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(200) NOT NULL,
        role ENUM('superadmin', 'cashier', 'customer') NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [existingUsers] = await connection.query(
      'SELECT username, role FROM tbl_users'
    );
    const knownUsernames = new Map(existingUsers.map(user => [user.username, user.role]));
    const hasSuperAdmin = existingUsers.some(user => user.role === 'superadmin');
    const seedAccounts = [
      {
        username: (process.env.SEED_SUPERADMIN_USERNAME || process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin').trim().toLowerCase(),
        name: 'Super Admin',
        role: 'superadmin',
        skipIfRoleExists: hasSuperAdmin,
      },
      {
        username: (process.env.SEED_CASHIER_USERNAME || 'kasir').trim().toLowerCase(),
        name: 'Kasir',
        role: 'cashier',
        skipIfRoleExists: false,
      },
      {
        username: (process.env.SEED_CUSTOMER_USERNAME || 'pelanggan').trim().toLowerCase(),
        name: 'Pelanggan',
        role: 'customer',
        skipIfRoleExists: false,
      },
    ];

    for (const account of seedAccounts) {
      if (account.skipIfRoleExists) continue;
      if (!USERNAME_PATTERN.test(account.username)) {
        throw new Error(`Username seed untuk peran ${account.role} tidak valid.`);
      }

      const currentRole = knownUsernames.get(account.username);
      if (currentRole) {
        if (currentRole !== account.role) {
          throw new Error(`Username seed "${account.username}" sudah dipakai akun dengan peran lain.`);
        }
        continue;
      }

      const password = crypto.randomBytes(24).toString('hex');
      const passwordHash = await hashPassword(password);
      await connection.query(
        `INSERT INTO tbl_users (username, display_name, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [account.username, account.name, passwordHash, account.role]
      );
      knownUsernames.set(account.username, account.role);
      created.push({ username: account.username, role: account.role, password });
    }

    await connection.commit();
    if (created.length) {
      console.log('Akun seed berhasil dibuat. Simpan password berikut sekarang; password disimpan sebagai hash dan tidak bisa dibaca ulang:');
      for (const account of created) {
        console.log(`${account.role}\t${account.username}\t${account.password}`);
      }
    } else {
      console.log('Tidak ada akun baru: akun seed sudah tersedia di database.');
    }
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedUsers().catch(err => {
  console.error('Gagal membuat akun seed:', err.message);
  process.exitCode = 1;
});
