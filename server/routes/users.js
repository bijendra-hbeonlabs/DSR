const express = require('express');
const { User, Role, Employee, Department, Designation } = require('../models');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const { hashPassword } = require('../utils/passwordUtils');

const router = express.Router();

router.use(authMiddleware);

// Get all users (restricted to SUPER_ADMIN and ADMIN)
router.get('/', roleCheck(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Employee, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] },
      order: [['username', 'ASC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Users can only view themselves unless they are admin/super_admin
    if (req.user.id !== parseInt(id) && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role.name)) {
      return res.status(403).json({ error: 'Forbidden - Cannot view other user details' });
    }

    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: Designation, as: 'designation' }
          ]
        },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// Create user (restricted to SUPER_ADMIN and ADMIN)
router.post('/', roleCheck(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { username, email, password, roleId, departmentId, active } = req.body;

    if (!username || !email || !password || !roleId) {
      return res.status(400).json({ error: 'Username, email, password, and roleId are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already registered' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId,
      departmentId: departmentId || null,
      active: active !== undefined ? active : true
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roleId: newUser.roleId,
        departmentId: newUser.departmentId,
        active: newUser.active
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Update user (Self edit, or SUPER_ADMIN / ADMIN)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isSelf = req.user.id === parseInt(id);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role.name);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden - Cannot update other users' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, email, password, roleId, departmentId, active } = req.body;

    // Check if username/email already taken by someone else
    if (username || email) {
      const uniqueCheckWhere = {
        [require('sequelize').Op.or]: [],
        id: { [require('sequelize').Op.ne]: id }
      };
      if (username) uniqueCheckWhere[require('sequelize').Op.or].push({ username });
      if (email) uniqueCheckWhere[require('sequelize').Op.or].push({ email });

      if (uniqueCheckWhere[require('sequelize').Op.or].length > 0) {
        const duplicate = await User.findOne({ where: uniqueCheckWhere });
        if (duplicate) {
          return res.status(400).json({ error: 'Username or Email is already in use' });
        }
      }
    }

    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (password) {
      updates.password = await hashPassword(password);
    }

    // Role & Active modifications are reserved for Admins only
    if (isAdmin) {
      if (roleId !== undefined) updates.roleId = roleId;
      if (departmentId !== undefined) updates.departmentId = departmentId || null;
      if (active !== undefined) updates.active = active;
    }

    await user.update(updates);

    // If active is updated, sync employee status
    if (active !== undefined) {
      const employee = await Employee.findOne({ where: { userId: id } });
      if (employee) {
        await employee.update({ status: active ? 'Active' : 'Inactive' });
      }
    }

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        departmentId: user.departmentId,
        active: user.active
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Delete user (restricted to SUPER_ADMIN and ADMIN)
router.delete('/:id', roleCheck(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete associated employee record as well (if CASCADE not automated, do it explicitly)
    const employee = await Employee.findOne({ where: { userId: id } });
    if (employee) {
      await employee.destroy();
    }

    await user.destroy();
    res.json({ message: 'User and corresponding profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

module.exports = router;
