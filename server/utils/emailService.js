const nodemailer = require('nodemailer');
const { User, Role, Employee, DSR, Project } = require('../models');
const { Op } = require('sequelize');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'placeholder@gmail.com',
      pass: process.env.SMTP_PASS || 'placeholderpassword'
    }
  });
};

const getSuperAdminEmail = async () => {
  const superAdmin = await User.findOne({
    include: [{
      model: Role,
      as: 'role',
      where: { name: 'SUPER_ADMIN' }
    }]
  });
  return superAdmin ? superAdmin.email : null;
};

// Send email notification upon DSR submission
const sendDsrSubmissionEmail = async (dsrId) => {
  try {
    const dsr = await DSR.findByPk(dsrId, {
      include: [
        { model: Employee, as: 'employee' },
        { model: Project, as: 'project' }
      ]
    });

    if (!dsr) {
      console.error(`[Email Error] DSR with ID ${dsrId} not found`);
      return;
    }

    const employee = dsr.employee;
    if (!employee) {
      console.error(`[Email Error] Employee not found for DSR ${dsrId}`);
      return;
    }

    // Recipients list
    const recipients = [];
    
    // 1. Employee
    if (employee.email) {
      recipients.push(employee.email);
    }

    // 2. Manager
    if (employee.managerId) {
      const manager = await User.findByPk(employee.managerId);
      if (manager && manager.email) {
        recipients.push(manager.email);
      }
    }

    // 3. Admin & Super Admins
    const admins = await User.findAll({
      include: [{
        model: Role,
        as: 'role',
        where: { name: ['SUPER_ADMIN', 'ADMIN'] }
      }]
    });
    admins.forEach(admin => {
      if (admin.email && !recipients.includes(admin.email)) {
        recipients.push(admin.email);
      }
    });

    if (recipients.length === 0) {
      console.log(`[Email Warning] No recipients found for DSR #${dsrId}`);
      return;
    }

    const superAdminEmail = await getSuperAdminEmail();
    const senderEmail = superAdminEmail || process.env.SMTP_USER || 'admin@hbeonlabs.com';
    const transporter = getTransporter();

    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const formattedDate = new Date(dsr.date).toLocaleDateString();
    
    const mailOptions = {
      from: `"HBEONLABS Notifications" <${senderEmail}>`,
      to: recipients.join(', '),
      subject: `[DSR Submitted] ${employeeName} - ${formattedDate}`,
      text: `Hello,\n\nThis is to notify you that ${employeeName} has submitted their Daily Status Report (DSR) for ${formattedDate}.\n\nReport details:\n• Project: ${dsr.project?.name || 'Unassigned'}\n• Completion: ${dsr.completionPercentage}%\n• Priority: ${dsr.priority}\n\nWork Description:\n${dsr.workDescription || 'N/A'}\n\nIssues Faced:\n${dsr.issues || 'None'}\n\nTomorrow's Plan:\n${dsr.tomorrowsPlan || 'N/A'}\n\nBest regards,\nHBEONLABS System`
    };

    let sent = false;
    let errorMsg = null;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      sent = true;
    } else {
      errorMsg = 'SMTP credentials not configured in .env';
    }

    console.log('\n=============================================');
    console.log('DSR SUBMISSION EMAIL EVENT LOG');
    console.log(`DSR ID: #${dsrId} for Employee: ${employeeName}`);
    console.log(`Recipients: ${recipients.join(', ')}`);
    console.log(`Email Send Status: ${sent ? 'SUCCESS' : `PRINTED TO CONSOLE (${errorMsg})`}`);
    if (!sent) {
      console.log('--- Email Text Content ---');
      console.log(mailOptions.text);
    }
    console.log('=============================================\n');

  } catch (err) {
    console.error('[Email Error] Failed to process DSR submission email:', err);
  }
};

// Send reminders to employees who haven't submitted DSR today
const sendDsrReminders = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find all submitted DSRs for today
    const todayDsrs = await DSR.findAll({
      where: {
        date: {
          [Op.between]: [todayStart, todayEnd]
        },
        status: 'Submitted'
      }
    });

    const submittedEmployeeIds = todayDsrs.map(d => d.employeeId);

    // Find all active employees who have NOT submitted today
    const missingEmployees = await Employee.findAll({
      where: {
        status: 'Active',
        id: { [Op.notIn]: submittedEmployeeIds.length > 0 ? submittedEmployeeIds : [-1] }
      }
    });

    if (missingEmployees.length === 0) {
      console.log(`[Scheduler] All active employees have submitted DSRs for today.`);
      return;
    }

    const superAdminEmail = await getSuperAdminEmail();
    const senderEmail = superAdminEmail || process.env.SMTP_USER || 'admin@hbeonlabs.com';
    const transporter = getTransporter();

    for (const emp of missingEmployees) {
      if (!emp.email) continue;

      const employeeName = `${emp.firstName} ${emp.lastName}`;
      const mailOptions = {
        from: `"HBEONLABS DSR Reminder" <${senderEmail}>`,
        to: emp.email,
        subject: `[Reminder] Daily Status Report (DSR) Submission Pending`,
        text: `Hello ${emp.firstName},\n\nThis is a friendly automated reminder that you have not submitted your Daily Status Report (DSR) for today.\n\nPlease log in to the portal and submit your report before the end of the day.\n\nBest regards,\nHBEONLABS Administration`
      };

      let sent = false;
      let errorMsg = null;
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
        sent = true;
      } else {
        errorMsg = 'SMTP credentials not configured in .env';
      }

      console.log(`[Scheduler Reminder] DSR pending reminder for ${employeeName} (${emp.email}): ${sent ? 'SENT' : `LOGGED (${errorMsg})`}`);
    }

  } catch (err) {
    console.error('[Scheduler Error] Failed to run DSR reminder checks:', err);
  }
};

module.exports = {
  sendDsrSubmissionEmail,
  sendDsrReminders
};
