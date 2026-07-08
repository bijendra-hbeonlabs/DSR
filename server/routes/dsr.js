const express = require('express');
const { DSR, Employee, Project, User, Role, Department, Attendance, Notification } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const { appendDsrToRegister } = require('../utils/excelHelper');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

router.use(authMiddleware);

// Helper function to mark attendance as Present
const registerAttendance = async (employeeId, dateStr, hours) => {
  try {
    const parsedDate = new Date(dateStr).toISOString().split('T')[0];
    const existing = await Attendance.findOne({
      where: { employeeId, date: parsedDate }
    });
    const hoursNum = parseFloat(hours) || 8.00;
    
    if (existing) {
      await existing.update({
        status: 'Present',
        workingHours: hoursNum,
        notes: 'Marked Present automatically on DSR submission.'
      });
    } else {
      await Attendance.create({
        employeeId,
        date: parsedDate,
        status: 'Present',
        checkInTime: '09:00:00',
        checkOutTime: '18:00:00',
        workingHours: hoursNum,
        overtimeHours: Math.max(0, hoursNum - 8.00),
        notes: 'Marked Present automatically on DSR submission.'
      });
    }
  } catch (err) {
    console.error('[Attendance Sync Error]', err.message);
  }
};

// Helper function to create in-app notifications
const createDsrNotifications = async (dsr, employee) => {
  try {
    const formattedDate = new Date(dsr.date).toLocaleDateString();
    const empName = `${employee.firstName} ${employee.lastName}`;
    const empUser = await User.findByPk(employee.userId, { include: [{ model: Role, as: 'role' }] });
    const roleLabel = empUser?.role?.name || 'EMPLOYEE';

    // 1. For Employee
    await Notification.create({
      userId: employee.userId,
      type: 'TaskCompleted',
      title: 'DSR Submitted Successfully',
      message: `Your DSR for ${formattedDate} has been logged in the system.`,
      data: { dsrId: dsr.id }
    });

    // 2. For Employee's Manager (if exists)
    if (employee.managerId) {
      await Notification.create({
        userId: employee.managerId,
        type: 'TaskCompleted',
        title: 'New Employee DSR Submitted',
        message: `${empName} has submitted a DSR for ${formattedDate}.`,
        data: { dsrId: dsr.id }
      });
    }

    // 3. For HR / Admin (all active HR/Admins)
    const hrUsers = await User.findAll({
      include: [{
        model: Role,
        as: 'role',
        where: { name: ['HR', 'ADMIN'] }
      }],
      where: { active: true }
    });

    for (const hr of hrUsers) {
      await Notification.create({
        userId: hr.id,
        type: 'TaskCompleted',
        title: 'New DSR Submitted',
        message: `${empName} (${roleLabel.replace(/_/g, ' ')}) has submitted a DSR for ${formattedDate}.`,
        data: { dsrId: dsr.id }
      });
    }

    // 4. For Super Admin (only if the user who submitted is HR or Manager)
    if (roleLabel === 'HR' || roleLabel === 'ADMIN' || roleLabel === 'MANAGER') {
      const superAdmins = await User.findAll({
        include: [{
          model: Role,
          as: 'role',
          where: { name: 'SUPER_ADMIN' }
        }],
        where: { active: true }
      });
      for (const sa of superAdmins) {
        await Notification.create({
          userId: sa.id,
          type: 'TaskCompleted',
          title: `New ${roleLabel.replace(/_/g, ' ')} DSR Submitted`,
          message: `${empName} has submitted a DSR for ${formattedDate}.`,
          data: { dsrId: dsr.id }
        });
      }
    }
  } catch (err) {
    console.error('[Notification Engine Error]', err.message);
  }
};

// GET DSR reports stats (Super Admin only)
router.get('/reports/stats', async (req, res) => {
  try {
    const roleName = req.user.role?.name;
    if (roleName !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Super Admin role required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const employees = await Employee.findAll({
      where: { status: 'Active' },
      include: [{ model: User, as: 'user', include: [{ model: Role, as: 'role' }] }]
    });

    const totalEmployees = employees.length;
    const totalManagers = employees.filter(e => e.user?.role?.name === 'MANAGER').length;
    const totalHR = employees.filter(e => e.user?.role?.name === 'HR' || e.user?.role?.name === 'ADMIN').length;

    const todaysSubmittedDSR = await DSR.count({
      where: {
        date: { [Op.between]: [startOfToday, endOfToday] },
        status: 'Submitted'
      }
    });

    const todaysMissingDSR = Math.max(0, totalEmployees - todaysSubmittedDSR);

    const presentToday = await Attendance.count({
      where: {
        date: today,
        status: { [Op.in]: ['Present', 'Late', 'Remote', 'WFH'] }
      }
    });

    const absentToday = await Attendance.count({
      where: {
        date: today,
        status: 'Absent'
      }
    });

    const totalProjects = await Project.count();

    res.json({
      totalEmployees,
      totalManagers,
      totalHR,
      todaysSubmittedDSR,
      todaysMissingDSR,
      presentToday,
      absentToday,
      totalProjects
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports stats', details: error.message });
  }
});

// GET DSR reports monthly grid (Super Admin only)
router.get('/reports/monthly-grid', async (req, res) => {
  try {
    const roleName = req.user.role?.name;
    if (roleName !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Super Admin role required' });
    }

    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startOfMonth = new Date(year, monthIndex, 1, 0, 0, 0);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    const employees = await Employee.findAll({
      where: { status: 'Active' },
      include: [
        { model: User, as: 'user', include: [{ model: Role, as: 'role' }] },
        { model: Department, as: 'department' }
      ]
    });

    const dsrs = await DSR.findAll({
      where: {
        date: { [Op.between]: [startOfMonth, endOfMonth] },
        status: 'Submitted'
      }
    });

    const attendances = await Attendance.findAll({
      where: {
        date: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    });

    const rows = employees.map(emp => {
      const empDsrs = dsrs.filter(d => d.employeeId === emp.id);
      const empAtts = attendances.filter(a => a.employeeId === emp.id);

      // Calculate total working days in that month (Mon-Fri)
      let totalWorkingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, monthIndex, d).getDay();
        if (dow !== 0 && dow !== 6) totalWorkingDays++;
      }

      const submittedDsrCount = empDsrs.length;
      const missingDsrCount = Math.max(0, totalWorkingDays - submittedDsrCount);

      let presentCount = 0;
      let absentCount = 0;

      empAtts.forEach(att => {
        if (att.status === 'Present' || att.status === 'Late' || att.status === 'Remote' || att.status === 'WFH') {
          presentCount++;
        } else if (att.status === 'Absent') {
          absentCount++;
        }
      });

      // Day-by-day logs
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayDateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const hasDsr = empDsrs.some(dsr => {
          const dsrDateStr = new Date(dsr.date).toISOString().split('T')[0];
          return dsrDateStr === dayDateStr;
        });

        const attRec = empAtts.find(a => {
          const attDateStr = new Date(a.date).toISOString().split('T')[0];
          return attDateStr === dayDateStr;
        });

        const dow = new Date(year, monthIndex, d).getDay();
        const isWeekend = (dow === 0 || dow === 6);

        let status = '✗'; // default missing
        if (hasDsr) {
          status = '✓';
        } else if (attRec && attRec.status === 'Absent') {
          status = '✗';
        } else if (isWeekend) {
          status = '-';
        }

        days.push({ day: d, status });
      }

      return {
        id: emp.id,
        employeeCode: `HBEON-${String(emp.id).padStart(4, '0')}`,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.user?.role?.name || 'EMPLOYEE',
        department: emp.department?.name || 'N/A',
        totalWorkingDays,
        submittedDsrCount,
        missingDsrCount,
        presentCount,
        absentCount,
        days
      };
    });

    res.json({
      daysInMonth,
      monthName: monthDate = new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'long' }),
      year,
      rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly grid reports', details: error.message });
  }
});

// GET DSR reports export (Super Admin only)
router.get('/reports/export', async (req, res) => {
  try {
    const roleName = req.user.role?.name;
    if (roleName !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Super Admin role required' });
    }

    const { type = 'daily', format = 'excel', date } = req.query;
    const filterDate = date ? new Date(date) : new Date();
    const startOfRange = new Date(filterDate);
    const endOfRange = new Date(filterDate);

    if (type === 'daily') {
      startOfRange.setHours(0,0,0,0);
      endOfRange.setHours(23,59,59,999);
    } else if (type === 'weekly') {
      startOfRange.setDate(startOfRange.getDate() - 7);
      startOfRange.setHours(0,0,0,0);
      endOfRange.setHours(23,59,59,999);
    } else { // monthly
      startOfRange.setDate(1);
      startOfRange.setHours(0,0,0,0);
      endOfRange.setMonth(endOfRange.getMonth() + 1);
      endOfRange.setDate(0);
      endOfRange.setHours(23,59,59,999);
    }

    // Fetch matching DSR records
    const dsrs = await DSR.findAll({
      where: {
        date: { [Op.between]: [startOfRange, endOfRange] },
        status: 'Submitted'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: User, as: 'user', include: [{ model: Role, as: 'role' }] },
            { model: Department, as: 'department' }
          ]
        },
        { model: Project, as: 'project' }
      ],
      order: [['date', 'DESC']]
    });

    const reportTitle = `${type.toUpperCase()} STATUS REPORT - ${filterDate.toLocaleDateString()}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=DSR_${type}_Export.csv`);

      let csvContent = 'Date,Employee ID,Employee Name,Role,Department,Project,Task Title,Hours Worked,Description\n';
      dsrs.forEach(d => {
        const dateStr = new Date(d.date).toISOString().split('T')[0];
        const empCode = `HBEON-${String(d.employee?.id).padStart(4, '0')}`;
        const name = `"${d.employee?.firstName} ${d.employee?.lastName}"`;
        const role = d.employee?.user?.role?.name || 'EMPLOYEE';
        const dept = `"${d.employee?.department?.name || 'N/A'}"`;
        const proj = `"${d.project?.name || d.customProjectName || 'General / Internal'}"`;
        const task = `"${(d.taskTitle || 'N/A').replace(/"/g, '""')}"`;
        const hours = d.hoursWorked || 0;
        const desc = `"${(d.workDescription || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        csvContent += `${dateStr},${empCode},${name},${role},${dept},${proj},${task},${hours},${desc}\n`;
      });

      return res.send(csvContent);
    } 

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=DSR_${type}_Export.pdf`);

      const doc = new PDFDocument({ margin: 30 });
      doc.pipe(res);

      doc.fontSize(14).font('Helvetica-Bold').text('HBEONLABS', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Daily Status Report Summary', { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(11).font('Helvetica-Bold').text(reportTitle);
      doc.moveDown(0.5);

      dsrs.forEach((d, idx) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`${idx + 1}. [${new Date(d.date).toISOString().split('T')[0]}] ${d.employee?.firstName} ${d.employee?.lastName} - ${d.project?.name || d.customProjectName || 'General'}`);
        doc.font('Helvetica').fontSize(8.5);
        doc.text(`   • Task: ${d.taskTitle || 'N/A'} (${d.hoursWorked} hrs)`);
        doc.text(`   • Description: ${d.workDescription || 'None'}`);
        if (d.remarks) doc.text(`   • Remarks: ${d.remarks}`);
        doc.moveDown(0.5);
      });

      doc.end();
      return;
    }

    // Excel format (default)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DSR_${type}_Export.xlsx`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Exported DSR');

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'HBEONLABS';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    sheet.mergeCells('A2:I2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = reportTitle;
    subtitleCell.font = { name: 'Arial', size: 12, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.alignment = { horizontal: 'center' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Role', 'Department', 'Project', 'Task Title', 'Hours Worked', 'Description'];
    sheet.getRow(4).values = headers;
    sheet.getRow(4).font = { name: 'Arial', size: 10, bold: true };
    sheet.getRow(4).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 20;
    sheet.getColumn(7).width = 25;
    sheet.getColumn(8).width = 12;
    sheet.getColumn(9).width = 40;

    dsrs.forEach(d => {
      sheet.addRow([
        new Date(d.date).toISOString().split('T')[0],
        `HBEON-${String(d.employee?.id).padStart(4, '0')}`,
        `${d.employee?.firstName} ${d.employee?.lastName}`,
        d.employee?.user?.role?.name || 'EMPLOYEE',
        d.employee?.department?.name || 'N/A',
        d.project?.name || d.customProjectName || 'General / Internal',
        d.taskTitle || 'N/A',
        parseFloat(d.hoursWorked || 0),
        d.workDescription || ''
      ]).font = { name: 'Arial', size: 9 };
    });

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    res.status(500).json({ error: 'Failed to export reports', details: error.message });
  }
});

// Get DSR records with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const where = {};
    const parsedLimit = Math.min(100, parseInt(limit) || 20);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    // Role-based filtering
    const userId = req.user.id;
    const roleName = req.user.role?.name;

    if (roleName === 'EMPLOYEE') {
      const employee = await Employee.findOne({ where: { userId } });
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      where.employeeId = employee.id;
    } else if (roleName === 'MANAGER') {
      const employee = await Employee.findOne({ where: { userId } });
      if (employee) {
        const teamEmployees = await Employee.findAll({
          where: {
            [Op.or]: [
              { id: employee.id },
              { managerId: userId }
            ]
          },
          attributes: ['id']
        });
        const employeeIds = teamEmployees.map(e => e.id);
        if (employeeId && employeeIds.includes(parseInt(employeeId))) {
          where.employeeId = employeeId;
        } else {
          where.employeeId = { [Op.in]: employeeIds };
        }
      } else {
        where.employeeId = -1; // Force empty array if manager has no profile
      }
    } else if (roleName === 'HR' || roleName === 'ADMIN') {
      // HR/ADMIN: sees all Employees and Managers DSRs, plus their own DSR
      const targetEmployees = await Employee.findAll({
        include: [{
          model: User,
          as: 'user',
          include: [{
            model: Role,
            as: 'role',
            where: {
              name: { [Op.in]: ['EMPLOYEE', 'MANAGER'] }
            }
          }]
        }]
      });
      const employeeIds = targetEmployees.map(e => e.id);
      
      const hrEmployee = await Employee.findOne({ where: { userId } });
      if (hrEmployee && !employeeIds.includes(hrEmployee.id)) {
        employeeIds.push(hrEmployee.id);
      }

      if (employeeId && employeeIds.includes(parseInt(employeeId))) {
        where.employeeId = employeeId;
      } else {
        where.employeeId = { [Op.in]: employeeIds.length > 0 ? employeeIds : [-1] };
      }
    } else {
      // SUPER_ADMIN
      if (employeeId) where.employeeId = employeeId;
    }

    if (status) where.status = status;

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { count, rows } = await DSR.findAndCountAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'email', 'userId'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: User, as: 'reviewer', attributes: ['id', 'username'] },
      ],
      limit: parsedLimit,
      offset,
      order: [['date', 'DESC']],
      attributes: { exclude: ['reviewComments'] }, // Include workDescription etc. in list
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
    res.status(500).json({ error: 'Failed to fetch DSR records', details: error.message });
  }
});

// Get DSR by ID
router.get('/:id', async (req, res) => {
  try {
    const dsr = await DSR.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Project, as: 'project' },
        { model: User, as: 'reviewer' },
      ],
    });

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    // Role-based access validation
    const roleName = req.user.role?.name;
    if (roleName === 'EMPLOYEE' && dsr.employee.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this DSR record' });
    }
    if (roleName === 'MANAGER') {
      const managerEmployee = await Employee.findOne({ where: { userId: req.user.id } });
      if (!managerEmployee || (dsr.employee.userId !== req.user.id && dsr.employee.managerId !== req.user.id)) {
        return res.status(403).json({ error: 'Access denied to this DSR record' });
      }
    }
    if (roleName === 'HR' || roleName === 'ADMIN') {
      // HR cannot access Super Admin DSR
      const targetUser = await User.findByPk(dsr.employee.userId, {
        include: [{ model: Role, as: 'role' }]
      });
      if (targetUser?.role?.name === 'SUPER_ADMIN' && dsr.employee.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this DSR record' });
      }
    }

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DSR', details: error.message });
  }
});

// Create DSR
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const {
      date,
      projectId,
      taskIds,
      workDescription,
      issues,
      tomorrowsPlan,
      completionPercentage,
      priority,
      status,
      startTime,
      endTime,
      taskTitle,
      module: moduleName,
      hoursWorked,
      remarks,
      customProjectName
    } = req.body;

    const dsrStatus = status || 'Draft';

    const dsr = await DSR.create({
      employeeId: employee.id,
      date: date || new Date(),
      projectId: projectId || null,
      taskIds: taskIds || [],
      workDescription,
      issues,
      tomorrowsPlan,
      completionPercentage: completionPercentage || 0,
      priority: priority || 'Medium',
      status: dsrStatus,
      startTime: startTime || null,
      endTime: endTime || null,
      taskTitle: taskTitle || null,
      module: moduleName || null,
      hoursWorked: hoursWorked || null,
      remarks: remarks || null,
      customProjectName: customProjectName || null,
      submittedAt: dsrStatus === 'Submitted' ? new Date() : null,
    });

    if (dsrStatus === 'Submitted') {
      // 1. Mark attendance
      await registerAttendance(employee.id, dsr.date, dsr.hoursWorked);

      // 2. Append to Excel
      await appendDsrToRegister(dsr.id);

      // 3. Create Notifications
      await createDsrNotifications(dsr, employee);

      // 4. Send email submission Confirmation
      const { sendDsrSubmissionEmail } = require('../utils/emailService');
      sendDsrSubmissionEmail(dsr.id).catch(err => console.error('Failed to send dsr email async:', err));
    }

    res.status(201).json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create DSR', details: error.message });
  }
});

// Update DSR
router.put('/:id', async (req, res) => {
  try {
    const dsr = await DSR.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }] });

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    const oldStatus = dsr.status;
    await dsr.update(req.body);

    if (req.body.status === 'Submitted' && oldStatus !== 'Submitted') {
      // 1. Mark attendance
      await registerAttendance(dsr.employeeId, dsr.date, dsr.hoursWorked);

      // 2. Append to Excel
      await appendDsrToRegister(dsr.id);

      // 3. Create Notifications
      await createDsrNotifications(dsr, dsr.employee);

      // 4. Send email submission Confirmation
      const { sendDsrSubmissionEmail } = require('../utils/emailService');
      sendDsrSubmissionEmail(dsr.id).catch(err => console.error('Failed to send dsr email async:', err));
    }

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update DSR', details: error.message });
  }
});

// Submit DSR (converts Draft to Submitted)
router.post('/:id/submit', async (req, res) => {
  try {
    const dsr = await DSR.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }] });

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    await dsr.update({
      status: 'Submitted',
      submittedAt: new Date(),
    });

    // 1. Mark attendance
    await registerAttendance(dsr.employeeId, dsr.date, dsr.hoursWorked);

    // 2. Append to Excel
    await appendDsrToRegister(dsr.id);

    // 3. Create Notifications
    await createDsrNotifications(dsr, dsr.employee);

    // 4. Send email submission Confirmation
    const { sendDsrSubmissionEmail } = require('../utils/emailService');
    sendDsrSubmissionEmail(dsr.id).catch(err => console.error('Failed to send dsr email async:', err));

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit DSR', details: error.message });
  }
});

// Stubs for approve and reject to maintain API routes if requested, returning empty/mock response
router.post('/:id/approve', async (req, res) => {
  res.json({ message: 'Approvals disabled. DSRs save immediately.' });
});

router.post('/:id/reject', async (req, res) => {
  res.json({ message: 'Rejections disabled. DSRs save immediately.' });
});

module.exports = router;
