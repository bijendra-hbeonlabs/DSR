const express = require('express');
const { Announcement, User, Department, Employee } = require('../models');
const { authMiddleware, roleCheck } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

// Get announcements
router.get('/', async (req, res) => {
  try {
    const isSpecialRole = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role.name);
    const where = {};

    // For regular users (EMPLOYEE and MANAGER), filter active/unexpired and department-specific
    if (!isSpecialRole) {
      // Find employee details to get department
      const employee = await Employee.findOne({ where: { userId: req.user.id } });
      const deptId = employee ? employee.departmentId : null;

      // Filter: Global announcements (departmentId is null) OR user's department announcement
      const deptConditions = [{ departmentId: null }];
      if (deptId) {
        deptConditions.push({ departmentId: deptId });
      }

      where[Op.and] = [
        { [Op.or]: deptConditions },
        {
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gte]: new Date() } }
          ]
        }
      ];
    }

    const announcements = await Announcement.findAll({
      where,
      include: [
        { model: User, as: 'postedByUser', attributes: ['id', 'username'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements', details: error.message });
  }
});

// Create announcement (restricted to SUPER_ADMIN, ADMIN, and MANAGER)
router.post('/', roleCheck(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { title, content, departmentId, priority, expiryDate } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      postedBy: req.user.id,
      departmentId: departmentId || null,
      priority: priority || 'Normal',
      expiryDate: expiryDate ? new Date(expiryDate) : null
    });

    const detailedAnnouncement = await Announcement.findByPk(announcement.id, {
      include: [
        { model: User, as: 'postedByUser', attributes: ['id', 'username'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json(detailedAnnouncement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create announcement', details: error.message });
  }
});

// Delete announcement (restricted to SUPER_ADMIN, ADMIN, and MANAGER)
router.delete('/:id', roleCheck(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Managers can only delete announcements they posted
    if (req.user.role.name === 'MANAGER' && announcement.postedBy !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden - Managers can only delete their own announcements' });
    }

    await announcement.destroy();
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement', details: error.message });
  }
});

module.exports = router;
