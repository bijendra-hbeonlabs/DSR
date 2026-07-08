const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { DSR, Employee, Project, User, Role, Department, Attendance } = require('../models');
const { Op } = require('sequelize');

const REPORTS_DIR = path.resolve(__dirname, '../reports');
const FILE_PATH = path.join(REPORTS_DIR, 'dsr_register.xlsx');

// Ensure reports directory exists
const ensureDirectoryExists = () => {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
};

/**
 * Appends a submitted DSR entry to the "DSR Register" worksheet.
 * @param {number} dsrId - ID of the DSR record
 */
async function appendDsrToRegister(dsrId) {
  try {
    ensureDirectoryExists();

    const dsr = await DSR.findByPk(dsrId, {
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: User, as: 'user', include: [{ model: Role, as: 'role' }] },
            { model: Department, as: 'department' },
            { model: User, as: 'manager' }
          ]
        },
        { model: Project, as: 'project' }
      ]
    });

    if (!dsr) {
      console.error(`[ExcelHelper] DSR not found: ${dsrId}`);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(FILE_PATH)) {
      await workbook.xlsx.readFile(FILE_PATH);
    } else {
      workbook.creator = 'HBEONLABS System';
      workbook.lastModifiedBy = 'HBEONLABS System';
      workbook.created = new Date();
      workbook.modified = new Date();
    }

    // Get or create DSR Register worksheet
    let sheet = workbook.getWorksheet('DSR Register');
    if (!sheet) {
      sheet = workbook.addWorksheet('DSR Register');
      
      // Setup Company Header
      sheet.mergeCells('A1:K1');
      const companyCell = sheet.getCell('A1');
      companyCell.value = 'HBEONLABS';
      companyCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Dark blue

      sheet.mergeCells('A2:K2');
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = 'Daily Status Report Register';
      subtitleCell.font = { name: 'Arial', size: 12, italic: true, color: { argb: 'FFFFFFFF' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Medium blue

      // Column headers
      const headers = [
        'Date',
        'Employee ID',
        'Employee Name',
        'Role',
        'Department',
        'Manager',
        'Project',
        'Task Title',
        'Work Description',
        'Hours Worked',
        'Submitted Time'
      ];
      sheet.getRow(4).values = headers;
      sheet.getRow(4).font = { name: 'Arial', size: 10, bold: true };
      sheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(4).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Light gray
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      sheet.getColumn(1).width = 12;  // Date
      sheet.getColumn(2).width = 15;  // Employee ID
      sheet.getColumn(3).width = 20;  // Employee Name
      sheet.getColumn(4).width = 15;  // Role
      sheet.getColumn(5).width = 18;  // Department
      sheet.getColumn(6).width = 20;  // Manager
      sheet.getColumn(7).width = 20;  // Project
      sheet.getColumn(8).width = 25;  // Task Title
      sheet.getColumn(9).width = 40;  // Description
      sheet.getColumn(10).width = 12; // Hours Worked
      sheet.getColumn(11).width = 22; // Submitted Time
    }

    const employee = dsr.employee;
    const user = employee?.user;
    const roleName = user?.role?.name || 'EMPLOYEE';
    const deptName = employee?.department?.name || 'N/A';
    
    let managerName = 'N/A';
    if (employee?.managerId) {
      const managerUser = await User.findByPk(employee.managerId, {
        include: [{ model: Employee, as: 'employee' }]
      });
      if (managerUser && managerUser.employee) {
        managerName = `${managerUser.employee.firstName} ${managerUser.employee.lastName}`;
      } else if (managerUser) {
        managerName = managerUser.username;
      }
    }

    const empCode = employee ? `HBEON-${String(employee.id).padStart(4, '0')}` : 'N/A';
    const empFullName = employee ? `${employee.firstName} ${employee.lastName}` : 'N/A';
    const projectName = dsr.project?.name || dsr.customProjectName || 'General / Internal';
    const formattedDate = new Date(dsr.date).toISOString().split('T')[0];
    const submittedTime = dsr.submittedAt ? new Date(dsr.submittedAt).toLocaleString() : new Date().toLocaleString();

    // Add entry row
    const newRow = sheet.addRow([
      formattedDate,
      empCode,
      empFullName,
      roleName.replace(/_/g, ' '),
      deptName,
      managerName,
      projectName,
      dsr.taskTitle || 'N/A',
      dsr.workDescription || 'N/A',
      parseFloat(dsr.hoursWorked || 0),
      submittedTime
    ]);

    // Format new row cells
    newRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.font = { name: 'Arial', size: 9 };
    });
    newRow.getCell(10).alignment = { horizontal: 'right' }; // Hours

    await workbook.xlsx.writeFile(FILE_PATH);
    console.log(`[ExcelHelper] Appended DSR #${dsrId} to register successfully.`);

    // Automatically trigger update of Monthly Attendance worksheet for this month
    const monthYear = formattedDate.substring(0, 7); // "YYYY-MM"
    await updateMonthlyAttendanceSheet(monthYear);

  } catch (error) {
    console.error('[ExcelHelper ERROR] Failed to append DSR to register:', error);
  }
}

/**
 * Re-generates or updates the "Monthly Attendance" worksheet for a given month ("YYYY-MM").
 * @param {string} monthYear - Format "YYYY-MM" (e.g. "2026-07")
 */
async function updateMonthlyAttendanceSheet(monthYear) {
  try {
    ensureDirectoryExists();
    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month

    const monthDate = new Date(year, month, 1);
    const monthName = monthDate.toLocaleString('en-US', { month: 'long' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Calculate active employees
    const employees = await Employee.findAll({
      where: { status: 'Active' },
      include: [
        { model: User, as: 'user', include: [{ model: Role, as: 'role' }] },
        { model: Department, as: 'department' }
      ]
    });

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(FILE_PATH)) {
      await workbook.xlsx.readFile(FILE_PATH);
    }

    // Get or create Monthly Attendance sheet
    const sheetName = `Attendance ${monthName} ${year}`;
    let sheet = workbook.getWorksheet(sheetName);
    if (sheet) {
      workbook.removeWorksheet(sheetName); // Rebuild clean
    }
    sheet = workbook.addWorksheet(sheetName);

    // Setup Header
    const lastColLetter = ExcelJS.utils.colHeaders[8 + daysInMonth];
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const companyCell = sheet.getCell('A1');
    companyCell.value = 'HBEONLABS';
    companyCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    sheet.mergeCells(`A2:${lastColLetter}2`);
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Monthly Attendance & DSR Report - ${monthName} ${year}`;
    subtitleCell.font = { name: 'Arial', size: 12, italic: true, color: { argb: 'FFFFFFFF' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };

    // Setup Table Headers
    const baseHeaders = [
      'Employee ID',
      'Employee Name',
      'Role',
      'Department',
      'Total Working Days',
      'Submitted DSR',
      'Missing DSR',
      'Present',
      'Absent'
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      baseHeaders.push(String(d));
    }

    const headerRow = sheet.getRow(4);
    headerRow.values = baseHeaders;
    headerRow.font = { name: 'Arial', size: 9, bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    sheet.getColumn(1).width = 15; // ID
    sheet.getColumn(2).width = 20; // Name
    sheet.getColumn(3).width = 15; // Role
    sheet.getColumn(4).width = 18; // Dept
    sheet.getColumn(5).width = 15; // Total Working Days
    sheet.getColumn(6).width = 12; // Submitted
    sheet.getColumn(7).width = 12; // Missing
    sheet.getColumn(8).width = 10; // Present
    sheet.getColumn(9).width = 10; // Absent

    for (let d = 1; d <= daysInMonth; d++) {
      sheet.getColumn(9 + d).width = 4; // Day columns
    }

    // 2. Fetch DSRs and Attendance for the month
    const startOfMonth = new Date(year, month, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

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

    // Write row for each employee
    for (const emp of employees) {
      const empCode = `HBEON-${String(emp.id).padStart(4, '0')}`;
      const empName = `${emp.firstName} ${emp.lastName}`;
      const roleName = emp.user?.role?.name || 'EMPLOYEE';
      const deptName = emp.department?.name || 'N/A';

      // Weekdays calculation
      let totalWorkingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month, d).getDay();
        if (dow !== 0 && dow !== 6) { // Mon-Fri are working days
          totalWorkingDays++;
        }
      }

      // Submitted DSR count
      const empDsrs = dsrs.filter(d => d.employeeId === emp.id);
      const submittedCount = empDsrs.length;

      // Attendance calculations from DB
      const empAtts = attendances.filter(a => a.employeeId === emp.id);
      
      let presentCount = 0;
      let absentCount = 0;

      // Calculate Present and Absent based on submissions and attendance status
      empAtts.forEach(att => {
        if (att.status === 'Present' || att.status === 'Late' || att.status === 'Remote' || att.status === 'WFH') {
          presentCount++;
        } else if (att.status === 'Absent') {
          absentCount++;
        }
      });

      const missingCount = Math.max(0, totalWorkingDays - submittedCount);

      const rowData = [
        empCode,
        empName,
        roleName.replace(/_/g, ' '),
        deptName,
        totalWorkingDays,
        submittedCount,
        missingCount,
        presentCount,
        absentCount
      ];

      // Add day by day logs (✓ or ✗)
      for (let d = 1; d <= daysInMonth; d++) {
        const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        // Find if DSR submitted on this day
        const hasDsr = empDsrs.some(dsr => {
          const dsrDateStr = new Date(dsr.date).toISOString().split('T')[0];
          return dsrDateStr === dayDateStr;
        });

        // Find attendance status
        const attRec = empAtts.find(a => {
          const attDateStr = new Date(a.date).toISOString().split('T')[0];
          return attDateStr === dayDateStr;
        });

        const dow = new Date(year, month, d).getDay();
        const isWeekend = (dow === 0 || dow === 6);

        if (hasDsr) {
          rowData.push('✓');
        } else if (attRec && attRec.status === 'Absent') {
          rowData.push('✗');
        } else if (isWeekend) {
          rowData.push('-');
        } else {
          // Weekday with missing DSR
          rowData.push('✗');
        }
      }

      const row = sheet.addRow(rowData);
      row.font = { name: 'Arial', size: 9 };

      // Apply borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      // Highlight red for missing days ('✗' on weekdays)
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = row.getCell(9 + d);
        cell.alignment = { horizontal: 'center' };
        if (cell.value === '✗') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Soft Red Fill
          };
          cell.font = {
            name: 'Arial',
            size: 9,
            color: { argb: 'FF9C0006' }, // Dark Red Text
            bold: true
          };
        } else if (cell.value === '✓') {
          cell.font = {
            name: 'Arial',
            size: 9,
            color: { argb: 'FF10B981' }, // Emerald Green Text
            bold: true
          };
        }
      }
    }

    await workbook.xlsx.writeFile(FILE_PATH);
    console.log(`[ExcelHelper] Generated sheet '${sheetName}' inside register workbook successfully.`);

  } catch (error) {
    console.error('[ExcelHelper ERROR] Failed to update Monthly Attendance sheet:', error);
  }
}

module.exports = {
  appendDsrToRegister,
  updateMonthlyAttendanceSheet
};
