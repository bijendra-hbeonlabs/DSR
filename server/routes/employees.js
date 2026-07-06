const express = require('express');
const { Employee, User, Department, Designation } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Get all employees with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { count, rows } = await Employee.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'roleId'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Designation, as: 'designation', attributes: ['id', 'name'] },
        { model: User, as: 'manager', attributes: ['id', 'username'] },
      ],
      limit,
      offset,
      order: [['firstName', 'ASC']],
      attributes: { exclude: ['password'] },
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user' },
        { model: Department, as: 'department' },
        { model: Designation, as: 'designation' },
        { model: User, as: 'manager' },
      ],
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
  }
});

// Create employee
router.post('/', async (req, res) => {
  try {
    const { userId, firstName, lastName, email, phone, departmentId, designationId, managerId, joinDate, status } = req.body;

    const employee = await Employee.create({
      userId,
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      designationId,
      managerId,
      joinDate,
      status: status || 'Active',
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create employee', details: error.message });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await employee.update(req.body);

    // If status is updated, sync user active status
    if (req.body.status !== undefined) {
      const user = await User.findByPk(employee.userId);
      if (user) {
        await user.update({ active: req.body.status === 'Active' || req.body.status === 'OnLeave' });
      }
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee', details: error.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee', details: error.message });
  }
});

module.exports = router;
