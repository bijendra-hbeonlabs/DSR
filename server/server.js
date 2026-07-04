require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = reportAppStartupMiddlewares(express());
const PORT = process.env.PORT || 5000;

function reportAppStartupMiddlewares(expressApp) {
  expressApp.use(cors());
  expressApp.use(bodyParser.json());
  expressApp.use(bodyParser.urlencoded({ extended: true }));
  return expressApp;
}

// Database connectivity check and fallback configuration
const startServer = async () => {
  try {
    const dialect = process.env.DB_DIALECT || 'mysql';
    if (dialect === 'mysql') {
      const mysql = require('mysql2/promise');
      const dbName = process.env.DB_NAME || 'hbeonlabs_db';
      try {
        const connectionConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'password',
          connectTimeout: 4000
        };
        console.log('[DATABASE] Verifying MySQL connection on port 3306...');
        const connection = await mysql.createConnection(connectionConfig);
        console.log('[DATABASE] MySQL server connection successful. Creating schema if not exists:', dbName);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.end();
      } catch (err) {
        console.warn('[DATABASE WARNING] MySQL connectivity check failed:', err.message);
        console.log('[DATABASE] Switching dialect to SQLite fallback...');
        process.env.DB_DIALECT = 'sqlite';
      }
    }

    // Load models under finalized dialect
    const models = require('./models');
    const { sequelize, User } = models;

    // Sync database
    const isDev = process.env.NODE_ENV === 'development';
    const isSqlite = sequelize.options.dialect === 'sqlite';
    await sequelize.sync({ alter: isDev && !isSqlite });
    console.log('[DATABASE] Connected and synced successfully');

    // Automatic seeding if database is empty
    const userCount = await User.count().catch(() => 0);
    if (userCount === 0) {
      console.log('[DATABASE] No users found. Automatically seeding test database...');
      const seedDatabase = require('./seeds/seedDatabase');
      await seedDatabase();
      console.log('[DATABASE] Test database seeded successfully.');
    }

    // Import routes dynamically
    const authRoutes = require('./routes/auth');
    const employeeRoutes = require('./routes/employees');
    const attendanceRoutes = require('./routes/attendance');
    const tasksRoutes = require('./routes/tasks');
    const projectsRoutes = require('./routes/projects');
    const dsrRoutes = require('./routes/dsr');
    const leavesRoutes = require('./routes/leaves');
    const usersRoutes = require('./routes/users');
    const announcementRoutes = require('./routes/announcements');

    // Bind routes
    app.use('/api/auth', authRoutes);
    app.use('/api/employees', employeeRoutes);
    app.use('/api/attendance', attendanceRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/projects', projectsRoutes);
    app.use('/api/dsr', dsrRoutes);
    app.use('/api/leaves', leavesRoutes);
    app.use('/api/users', usersRoutes);
    app.use('/api/announcements', announcementRoutes);

    // Dashboard stats endpoint
    const { getDashboardStats } = require('./controllers/dashboardController');
    const { authMiddleware } = require('./middleware/auth');
    app.get('/api/dashboard/stats', authMiddleware, getDashboardStats);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date() });
    });

    // Error handling middlewares
    const errorHandler = require('./middleware/errorHandler');
    app.use(errorHandler);

    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Start Express Listener
    app.listen(PORT, () => {
      console.log(`[SERVER] HBEONLABS Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[SERVER RUNTIME ERROR]', error);
    process.exit(1);
  }
};

startServer();
