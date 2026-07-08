const express = require('express');
const { Project, ProjectMember, User, Task, Department, Employee } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

// Get all projects with pagination and optimization
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    const parsedLimit = Math.min(100, parseInt(limit) || 20);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    if (status) where.status = status;

    // Filter projects for employees: only show assigned projects
    const roleName = req.user.role?.name;
    if (roleName === 'EMPLOYEE') {
      const userMemberships = await ProjectMember.findAll({
        where: { userId: req.user.id },
        attributes: ['projectId'],
      });
      const projectIds = userMemberships.map(m => m.projectId);
      where.id = { [Op.in]: projectIds.length > 0 ? projectIds : [-1] };
    } else if (roleName === 'MANAGER') {
      // Find team members
      const teamEmployees = await Employee.findAll({
        where: { managerId: req.user.id },
        attributes: ['userId']
      });
      const teamUserIds = teamEmployees.map(e => e.userId);
      teamUserIds.push(req.user.id);

      // Projects where team members are assigned
      const teamMemberships = await ProjectMember.findAll({
        where: { userId: { [Op.in]: teamUserIds } },
        attributes: ['projectId'],
      });
      const projectIds = teamMemberships.map(m => m.projectId);

      where[Op.or] = [
        { teamLeadId: req.user.id },
        { id: { [Op.in]: projectIds } }
      ];
    }

    const { count, rows } = await Project.findAndCountAll({
      where,
      include: [
        { model: User, as: 'teamLead', attributes: ['id', 'username'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: ProjectMember, as: 'members', attributes: ['id', 'userId', 'role'] },
        { model: Task, as: 'tasks', attributes: ['id', 'status'], limit: 5 },
      ],
      limit: parsedLimit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['description'] },
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
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'teamLead' },
        { model: Department, as: 'department' },
        { model: ProjectMember, as: 'members', include: [{ model: User, as: 'user' }] },
        { model: Task, as: 'tasks' },
      ],
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project', details: error.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, startDate, endDate, departmentId, status, progress, teamLeadId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description,
      status: status || 'Planning',
      progress: progress || 0,
      teamLeadId: teamLeadId || req.user.id,
      departmentId,
      startDate,
      endDate,
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.update(req.body);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

// Add team member to project
router.post('/:id/members', async (req, res) => {
  try {
    const { userId, role = 'Member' } = req.body;
    const projectId = req.params.id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const member = await ProjectMember.create({
      projectId,
      userId,
      role,
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member', details: error.message });
  }
});

// Get project members
router.get('/:id/members', async (req, res) => {
  try {
    const members = await ProjectMember.findAll({
      where: { projectId: req.params.id },
      include: [{ model: User, as: 'user' }],
    });

    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members', details: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await project.destroy();
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project', details: error.message });
  }
});

module.exports = router;
