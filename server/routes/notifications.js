const express = require('express');
const { Notification } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Get all notifications for the logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({
      read: true,
      readAt: new Date()
    });

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification', details: error.message });
  }
});

// Mark all notifications as read
router.post('/read-all', async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read', details: error.message });
  }
});

module.exports = router;
