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
    const notificationsRoutes = require('./routes/notifications');
    const appraisalsRoutes = require('./routes/appraisals');
    const candidatesRoutes = require('./routes/candidates');

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
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/appraisals', appraisalsRoutes);
    app.use('/api/candidates', candidatesRoutes);

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

    // DSR Reminder scheduler (runs daily at 6:00 PM / 18:00)
    let lastReminderDate = '';
    setInterval(async () => {
      const now = new Date();
      const dateStr = now.toDateString();
      if (now.getHours() === 18 && now.getMinutes() === 0 && lastReminderDate !== dateStr) {
        lastReminderDate = dateStr;
        console.log(`[Scheduler] Clock is 18:00. Triggering daily DSR reminders...`);
        try {
          const { sendDsrReminders } = require('./utils/emailService');
          await sendDsrReminders();
        } catch (err) {
          console.error('[Scheduler Error] Failed to run DSR reminders:', err);
        }
      }
    }, 60000);

    // Daily Close Scheduler (runs daily at 11:59 PM / 23:59)
    let lastCloseDate = '';
    setInterval(async () => {
      const now = new Date();
      const dateStr = now.toDateString();
      if (now.getHours() === 23 && now.getMinutes() === 59 && lastCloseDate !== dateStr) {
        lastCloseDate = dateStr;
        console.log(`[Scheduler] Clock is 23:59. Triggering Daily Close procedures...`);
        try {
          const { DSR, Employee, User, Role, Attendance, Notification } = require('./models');
          const { Op } = require('sequelize');
          const nodemailer = require('nodemailer');

          const todayStart = new Date();
          todayStart.setHours(0,0,0,0);
          const todayEnd = new Date();
          todayEnd.setHours(23,59,59,999);
          const todayDateStr = now.toISOString().split('T')[0];

          // 1. Find all submitted DSRs for today
          const todayDsrs = await DSR.findAll({
            where: {
              date: { [Op.between]: [todayStart, todayEnd] },
              status: 'Submitted'
            },
            include: [{ model: Employee, as: 'employee' }]
          });
          const submittedEmpIds = todayDsrs.map(d => d.employeeId);
          const submittedNames = todayDsrs.map(d => d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : 'Unknown');

          // 2. Find all active employees who are not Super Admin
          const activeEmployees = await Employee.findAll({
            where: { status: 'Active' },
            include: [{
              model: User,
              as: 'user',
              include: [{
                model: Role,
                as: 'role',
                where: { name: { [Op.ne]: 'SUPER_ADMIN' } }
              }]
            }]
          });

          const missingEmployees = activeEmployees.filter(emp => !submittedEmpIds.includes(emp.id));
          const missingNames = missingEmployees.map(emp => `${emp.firstName} ${emp.lastName}`);

          // 3. Mark absent in attendance
          for (const emp of missingEmployees) {
            const existingAtt = await Attendance.findOne({
              where: { employeeId: emp.id, date: todayDateStr }
            });
            if (existingAtt) {
              await existingAtt.update({
                status: 'Absent',
                workingHours: 0,
                notes: 'Marked Absent automatically due to missing daily DSR.'
              });
            } else {
              await Attendance.create({
                employeeId: emp.id,
                date: todayDateStr,
                status: 'Absent',
                checkInTime: null,
                checkOutTime: null,
                workingHours: 0,
                overtimeHours: 0,
                notes: 'Marked Absent automatically due to missing daily DSR.'
              });
            }
          }

          // 4. Send summary to Super Admins
          const superAdmins = await User.findAll({
            include: [{ model: Role, as: 'role', where: { name: 'SUPER_ADMIN' } }],
            where: { active: true }
          });

          const totalActive = activeEmployees.length;
          const totalSubmitted = submittedEmpIds.length;
          const totalMissing = missingEmployees.length;

          const emailSubject = `[DSR Summary] Daily Submission Summary - ${todayDateStr}`;
          const emailText = `Hello Super Admin,\n\nHere is the Daily DSR submission summary for ${todayDateStr}:\n\n` +
            `• Total Active Employees (Excl. Super Admin): ${totalActive}\n` +
            `• Today's Submitted DSRs: ${totalSubmitted}\n` +
            `• Today's Missing DSRs (Marked Absent): ${totalMissing}\n\n` +
            `Submitted Employees:\n${submittedNames.length > 0 ? submittedNames.map(name => ` - ${name}`).join('\n') : ' None'}\n\n` +
            `Missing/Absent Employees:\n${missingNames.length > 0 ? missingNames.map(name => ` - ${name}`).join('\n') : ' None'}\n\n` +
            `Best regards,\nHBEONLABS System`;

          // Send summary emails
          const smtpUser = process.env.SMTP_USER || 'placeholder@gmail.com';
          const smtpPass = process.env.SMTP_PASS || 'placeholderpassword';
          const host = process.env.SMTP_HOST || 'smtp.gmail.com';
          const port = parseInt(process.env.SMTP_PORT) || 587;
          const secure = process.env.SMTP_SECURE === 'true';

          const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: smtpUser, pass: smtpPass } });
          const senderEmail = smtpUser || 'admin@hbeonlabs.com';

          for (const sa of superAdmins) {
            if (sa.email) {
              if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await transporter.sendMail({
                  from: `"HBEONLABS Reports" <${senderEmail}>`,
                  to: sa.email,
                  subject: emailSubject,
                  text: emailText
                }).catch(err => console.error(`[Summary Email Error] Failed to send to ${sa.email}:`, err.message));
              }
            }

            // Create in-app notification
            await Notification.create({
              userId: sa.id,
              type: 'SystemAnnouncement',
              title: 'Daily DSR Submission Summary',
              message: `Daily Close Summary: ${totalSubmitted} submitted, ${totalMissing} missing (marked absent) for ${todayDateStr}.`,
              data: { submitted: totalSubmitted, missing: totalMissing, date: todayDateStr }
            }).catch(err => console.error('[Summary Notification Error]', err.message));
          }

          console.log(`[Scheduler] Daily close procedures completed. Marked ${totalMissing} absent, notified Super Admins.`);

        } catch (err) {
          console.error('[Scheduler Error] Daily Close failed:', err);
        }
      }
    }, 60000);
  } catch (error) {
    console.error('[SERVER RUNTIME ERROR]', error);
    process.exit(1);
  }
};

startServer();
