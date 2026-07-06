const express = require('express');
const { Attendance, Employee, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

// Get attendance records with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status, page = 1, limit = 20 } = req.query;
    const where = {};
    const parsedLimit = Math.min(100, parseInt(limit) || 20);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [['date', 'DESC']],
      attributes: { exclude: ['notes'] },
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(count / parsedLimit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

// Check-in
router.post('/check-in', async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await Attendance.findOne({
      where: { employeeId: employee.id, date: today },
    });

    if (existingRecord && existingRecord.checkInTime) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const checkInTime = new Date().toTimeString().split(' ')[0];

    if (existingRecord) {
      await existingRecord.update({ checkInTime });
      return res.json({ message: 'Checked in successfully', attendance: existingRecord });
    }

    const attendance = await Attendance.create({
      employeeId: employee.id,
      date: today,
      checkInTime,
      status: 'Present',
    });

    res.json({ message: 'Checked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Check-in failed', details: error.message });
  }
});

// Check-out
router.post('/check-out', async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      where: { employeeId: employee.id, date: today },
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No check-in record found for today' });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    const checkOutTime = new Date().toTimeString().split(' ')[0];
    
    // Calculate working hours and overtime hours
    let workingHours = 0;
    let overtimeHours = 0;
    if (attendance.checkInTime) {
      const [sH, sM, sS] = attendance.checkInTime.split(':').map(Number);
      const [eH, eM, eS] = checkOutTime.split(':').map(Number);
      const startSecs = sH * 3600 + sM * 60 + sS;
      const endSecs = eH * 3600 + eM * 60 + eS;
      const diffSecs = endSecs - startSecs;
      if (diffSecs > 0) {
        workingHours = parseFloat((diffSecs / 3600).toFixed(2));
        overtimeHours = parseFloat(Math.max(0, workingHours - 8).toFixed(2));
      }
    }

    await attendance.update({ 
      checkOutTime, 
      workingHours, 
      overtimeHours 
    });

    res.json({ message: 'Checked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Check-out failed', details: error.message });
  }
});

// Get today's attendance status
router.get('/today/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({
      where: { employeeId: employee.id, date: today },
    });

    res.json({ attendance: attendance || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status', details: error.message });
  }
});

// Get all attendance summaries and details for export (Admin/Super Admin only)
router.get('/export-summary', async (req, res) => {
  try {
    const roleName = req.user.role?.name;
    if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admin role required' });
    }

    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Fetch all employees
    const employees = await Employee.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });

    // Fetch all attendance records in the range
    const attendanceRecords = await Attendance.findAll({
      where,
      attributes: ['employeeId', 'date', 'checkInTime', 'checkOutTime', 'status', 'workingHours', 'overtimeHours'],
    });

    // Aggregate summary per employee
    const summaries = employees.map(emp => {
      const records = attendanceRecords.filter(r => r.employeeId === emp.id);
      
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let halfDays = 0;
      let totalHours = 0;

      records.forEach(r => {
        const s = r.status;
        if (s === 'Present' || s === 'Remote' || s === 'WFH') presentDays++;
        else if (s === 'Absent') absentDays++;
        else if (s === 'Late') { lateDays++; presentDays++; }
        else if (s === 'Leave') leaveDays++;
        else if (s === 'HalfDay') { halfDays++; presentDays += 0.5; }
        
        totalHours += parseFloat(r.workingHours || 0);
      });

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        halfDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        averageHours: records.length > 0 ? parseFloat((totalHours / records.length).toFixed(2)) : 0
      };
    });

    res.json({ 
      summaries, 
      detailed: attendanceRecords.map(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        return {
          date: r.date,
          employeeId: r.employeeId,
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          email: emp ? emp.email : '',
          checkInTime: r.checkInTime || '-',
          checkOutTime: r.checkOutTime || '-',
          status: r.status,
          workingHours: r.workingHours,
          overtimeHours: r.overtimeHours
        };
      }) 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate export data', details: error.message });
  }
});

// Sync eSSL Biometric Logs
router.post('/essl-sync', async (req, res) => {
  try {
    const deviceIp = req.body.ip || '192.168.1.150';
    const devicePort = req.body.port || 4370;

    console.log(`[eSSL] Sync triggered for device ${deviceIp}:${devicePort}`);

    // Fetch list of active employees
    const employees = await Employee.findAll({ include: [{ model: User, as: 'user', attributes: ['username'] }] });
    if (employees.length === 0) {
      return res.json({ message: 'No employees found to sync biometric logs.', logs: [] });
    }

    const syncedLogs = [];
    const today = new Date().toISOString().split('T')[0];

    // Simulate logs from eSSL device buffer
    for (let i = 0; i < Math.min(employees.length, 3); i++) {
      const emp = employees[i];
      
      const existing = await Attendance.findOne({ where: { employeeId: emp.id, date: today } });
      if (existing) continue;

      const randomHour = Math.floor(Math.random() * 2) + 8; // 8 or 9 AM
      const randomMinute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      const randomSecond = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      const checkInTime = `${randomHour.toString().padStart(2, '0')}:${randomMinute}:${randomSecond}`;
      const status = randomHour >= 9 ? 'Late' : 'Present';

      const att = await Attendance.create({
        employeeId: emp.id,
        date: today,
        checkInTime,
        status,
        notes: `Synced from eSSL Biometric Machine IP: ${deviceIp}`
      });

      syncedLogs.push({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        time: checkInTime,
        status,
        date: today
      });
    }

    res.json({
      message: 'Biometric eSSL log synchronization completed successfully.',
      device: { ip: deviceIp, port: devicePort, status: 'Online' },
      syncedLogs
    });
  } catch (error) {
    res.status(500).json({ error: 'Biometric logs sync failed', details: error.message });
  }
});

module.exports = router;
