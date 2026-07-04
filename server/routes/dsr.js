const express = require('express');
const { DSR, Employee, Project, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

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
    const roleName = req.user.roleName;

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
    } else {
      // ADMIN or SUPER_ADMIN
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
      attributes: { exclude: ['workDescription', 'issues', 'tomorrowsPlan', 'attachments', 'reviewComments'] },
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
    if (req.user.roleName === 'EMPLOYEE' && dsr.employee.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this DSR record' });
    }
    if (req.user.roleName === 'MANAGER') {
      const managerEmployee = await Employee.findOne({ where: { userId: req.user.id } });
      if (!managerEmployee || (dsr.employee.userId !== req.user.id && dsr.employee.managerId !== req.user.id)) {
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

    const { date, projectId, taskIds, workDescription, issues, tomorrowsPlan, completionPercentage, priority } = req.body;

    const dsr = await DSR.create({
      employeeId: employee.id,
      date: date || new Date(),
      projectId,
      taskIds: taskIds || [],
      workDescription,
      issues,
      tomorrowsPlan,
      completionPercentage: completionPercentage || 0,
      priority: priority || 'Medium',
      status: 'Draft',
    });

    res.status(201).json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create DSR', details: error.message });
  }
});

// Update DSR
router.put('/:id', async (req, res) => {
  try {
    const dsr = await DSR.findByPk(req.params.id);

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    await dsr.update(req.body);
    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update DSR', details: error.message });
  }
});

// Submit DSR
router.post('/:id/submit', async (req, res) => {
  try {
    const dsr = await DSR.findByPk(req.params.id);

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    await dsr.update({
      status: 'Submitted',
      submittedAt: new Date(),
    });

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit DSR', details: error.message });
  }
});

// Approve DSR
router.post('/:id/approve', async (req, res) => {
  try {
    const { reviewComments } = req.body;
    const dsr = await DSR.findByPk(req.params.id);

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    await dsr.update({
      status: 'Approved',
      reviewedBy: req.user.id,
      reviewComments,
      approvedAt: new Date(),
    });

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve DSR', details: error.message });
  }
});

// Reject DSR
router.post('/:id/reject', async (req, res) => {
  try {
    const { reviewComments } = req.body;
    const dsr = await DSR.findByPk(req.params.id);

    if (!dsr) {
      return res.status(404).json({ error: 'DSR not found' });
    }

    await dsr.update({
      status: 'Rejected',
      reviewedBy: req.user.id,
      reviewComments,
    });

    res.json(dsr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject DSR', details: error.message });
  }
});

module.exports = router;
