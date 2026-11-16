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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/stores', storesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/sale-items', saleItemsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/stock', stockRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

async function startServer() {
  try {
    await pool.query(`
      ALTER TABLE tbl_pelanggan
        ADD COLUMN IF NOT EXISTS member_ref VARCHAR(100) NULL,
        ADD COLUMN IF NOT EXISTS is_member TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS member_discount DECIMAL(5,2) NOT NULL DEFAULT 0
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
    console.error('❌ Failed to prepare member card database schema:', err.message);
    process.exit(1);
  }
}

startServer();
