const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');
const storesRouter = require('./routes/stores');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const saleItemsRouter = require('./routes/saleItems');
const customersRouter = require('./routes/customers');
const stockRouter = require('./routes/stock');
const logsRouter = require('./routes/logs');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const { hashPassword } = require('./auth/passwords');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.use('/api', requireAuth);
app.use('/api/users', usersRouter);
app.use('/api/stores', storesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/sale-items', saleItemsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/stock', stockRouter);
app.use('/api/logs', logsRouter);

async function startServer() {
  try {
    await pool.query(`
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

    const bootstrapUsername = String(process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim().toLowerCase();
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
    const [admins] = await pool.query(
      "SELECT id FROM tbl_users WHERE role = 'superadmin' LIMIT 1"
    );
    if (!admins.length) {
      if (bootstrapUsername && bootstrapPassword) {
        if (!/^[a-z0-9._-]{3,32}$/.test(bootstrapUsername) || bootstrapPassword.length < 8) {
          throw new Error('BOOTSTRAP_ADMIN_USERNAME harus valid dan BOOTSTRAP_ADMIN_PASSWORD minimal 8 karakter.');
        }
        const passwordHash = await hashPassword(bootstrapPassword);
        await pool.query(
          `INSERT INTO tbl_users (username, display_name, password_hash, role, is_active)
           VALUES (?, 'Super Admin', ?, 'superadmin', 1)`,
          [bootstrapUsername, passwordHash]
        );
        console.log(`✅ Bootstrap Super Admin account created: ${bootstrapUsername}`);
      } else {
        console.warn('⚠️ Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD to create the initial Super Admin.');
      }
    }

    await pool.query(`
      ALTER TABLE tbl_pelanggan
        ADD COLUMN IF NOT EXISTS member_ref VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS is_member TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS member_discount DECIMAL(5,2) NOT NULL DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE tbl_transaksi
        ADD COLUMN IF NOT EXISTS order_status VARCHAR(24) NOT NULL DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT UNSIGNED NULL,
        ADD COLUMN IF NOT EXISTS approved_by_user_id BIGINT UNSIGNED NULL,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL DEFAULT NULL
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_pos_settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 POS Backend API Server running at http://127.0.0.1:${PORT}`);
      console.log(`📦 Connected to Local MySQL: ${process.env.DB_NAME || 'db_kita'} on port ${process.env.DB_PORT || 3306}`);
    });
  } catch (err) {
    console.error('❌ Failed to prepare database schema:', err.message);
    process.exit(1);
  }
}

startServer();
