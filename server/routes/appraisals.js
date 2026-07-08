const express = require('express');
const { Appraisal, Employee } = require('../models');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Get all appraisals
router.get('/', async (req, res) => {
  try {
    const appraisals = await Appraisal.findAll({
      include: [{ model: Employee, as: 'employee' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appraisals', details: error.message });
  }
});

// Create new appraisal
router.post('/', async (req, res) => {
  try {
    const { employeeId, techRating, commRating, leadRating, deliveryRating, remarks, goals } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const tech = Number(techRating) || 4;
    const comm = Number(commRating) || 4;
    const lead = Number(leadRating) || 4;
    const deliv = Number(deliveryRating) || 4;
    const overall = Math.round((tech + comm + lead + deliv) / 4);

    const appraisal = await Appraisal.create({
      employeeId,
      techRating: tech,
      commRating: comm,
      leadRating: lead,
      deliveryRating: deliv,
      overallRating: overall,
      remarks: remarks || '',
      goals: goals || '',
    });

    // Fetch details with employee profile
    const createdAppraisal = await Appraisal.findByPk(appraisal.id, {
      include: [{ model: Employee, as: 'employee' }]
    });

    res.status(201).json(createdAppraisal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appraisal', details: error.message });
  }
});

module.exports = router;
