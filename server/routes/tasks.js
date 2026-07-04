const express = require('express');
const { Task, Project, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

// Get all tasks with filters and pagination
router.get('/', async (req, res) => {
  try {
    const { projectId, status, assignedTo, priority, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    const where = {};
    const parsedLimit = Math.min(100, parseInt(limit) || 20);
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (priority) where.priority = priority;

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'createdBy', attributes: ['id', 'username'] },
      ],
      limit: parsedLimit,
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      attributes: { exclude: ['comments', 'attachments', 'checklist'] },
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
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'assignee' },
        { model: User, as: 'createdBy' },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task', details: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, priority, dueDate, startDate, estimatedHours, status } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: 'Title and project ID are required' });
    }

    const task = await Task.create({
      title,
      description,
      projectId,
      assignedTo,
      assignedBy: req.user.id,
      priority: priority || 'Medium',
      status: status || 'Pending',
      dueDate,
      startDate,
      estimatedHours,
      progressPercentage: 0,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update(req.body);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({ status });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status', details: error.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task', details: error.message });
  }
});

module.exports = router;
