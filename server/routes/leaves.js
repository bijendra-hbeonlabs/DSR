const express = require('express');
const { Leave, Employee, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sendWebhookNotification } = require('../utils/notifications');

const router = express.Router();

router.use(authMiddleware);

// Get leave records
router.get('/', async (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const where = {};

    if (req.user.role.name === 'EMPLOYEE') {
      const employee = await Employee.findOne({ where: { userId: req.user.id } });
      if (!employee) {
        return res.status(404).json({ error: 'Employee profile not found' });
      }
      where.employeeId = employee.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.startDate = {
        [Op.gte]: new Date(startDate),
      };
      where.endDate = {
        [Op.lte]: new Date(endDate),
      };
    }

    const records = await Leave.findAll({
      where,
      include: [
        { model: Employee, as: 'employee' },
        { model: User, as: 'approver' },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startDate', 'DESC']],
    });

    const total = await Leave.count({ where });

    res.json({ data: records, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaves', details: error.message });
  }
});

// Get leave by ID
router.get('/:id', async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.params.id, {
      include: [
        { model: Employee, as: 'employee' },
        { model: User, as: 'approver' },
      ],
    });

    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave', details: error.message });
  }
});

// Apply for leave
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findOne({ where: { userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
    }

    const leave = await Leave.create({
      employeeId: employee.id,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Applied',
      appliedDate: new Date(),
    });

    sendWebhookNotification('leave_apply', {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      leaveType,
      startDate: new Date(startDate).toLocaleDateString(),
      endDate: new Date(endDate).toLocaleDateString(),
      reason: reason || 'N/A'
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply for leave', details: error.message });
  }
});

// Approve leave
router.post('/:id/approve', async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.params.id);

    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    await leave.update({
      status: 'Approved',
      approvedBy: req.user.id,
    });

    const emp = await Employee.findByPk(leave.employeeId);
    const app = await User.findByPk(req.user.id);
    if (emp && app) {
      sendWebhookNotification('leave_approved', {
        employeeName: `${emp.firstName} ${emp.lastName}`,
        leaveType: leave.leaveType,
        startDate: new Date(leave.startDate).toLocaleDateString(),
        endDate: new Date(leave.endDate).toLocaleDateString(),
        approverName: app.username
      });
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve leave', details: error.message });
  }
});

// Reject leave
router.post('/:id/reject', async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.params.id);

    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    await leave.update({
      status: 'Rejected',
      approvedBy: req.user.id,
    });

    const emp = await Employee.findByPk(leave.employeeId);
    const app = await User.findByPk(req.user.id);
    if (emp && app) {
      sendWebhookNotification('leave_rejected', {
        employeeName: `${emp.firstName} ${emp.lastName}`,
        leaveType: leave.leaveType,
        startDate: new Date(leave.startDate).toLocaleDateString(),
        endDate: new Date(leave.endDate).toLocaleDateString(),
        approverName: app.username
      });
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject leave', details: error.message });
  }
});

// Delete leave
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.params.id);

    if (!leave) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    if (leave.status !== 'Applied') {
      return res.status(400).json({ error: 'Can only delete leave applications' });
    }

    await leave.destroy();
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete leave', details: error.message });
  }
});

module.exports = router;
