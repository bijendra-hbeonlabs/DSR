const express = require('express');
const { Candidate } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Get all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates', details: error.message });
  }
});

// Create candidate
router.post('/', async (req, res) => {
  try {
    const { name, role, experience, interviewerScore } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const candidate = await Candidate.create({
      name,
      role,
      experience: experience || 'N/A',
      interviewerScore: Number(interviewerScore) || 8.0,
      stage: 'Applied',
    });

    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create candidate', details: error.message });
  }
});

// Update candidate stage
router.put('/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const candidate = await Candidate.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await candidate.update({ stage });
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update candidate stage', details: error.message });
  }
});

module.exports = router;
