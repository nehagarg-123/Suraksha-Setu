import express from 'express';
import DamageReport from '../models/DamageReport.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/damage-reports
router.get('/', async (req, res) => {
  try {
    const { incident, verified } = req.query;
    const query = {};
    if (incident) query.incident = incident;
    if (verified !== undefined) query.verified = verified === 'true';

    const reports = await DamageReport.find(query)
      .populate('reported_by', 'name email')
      .populate('verified_by', 'name')
      .sort({ created_at: -1 })
      .lean();

    return res.json(reports.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Damage reports list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/damage-reports
router.post('/', requireAuth, async (req, res) => {
  try {
    const report = new DamageReport({
      ...req.body,
      reported_by: req.user.id,
    });
    await report.save();

    return res.status(201).json({
      ...report.toObject(),
      id: report._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Damage report create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/damage-reports/:id/verify - Verify damage report (admin only)
router.put('/:id/verify', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const report = await DamageReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Damage report not found' });
    }

    report.verified = true;
    report.verified_by = req.user.id;
    await report.save();

    return res.json({
      ...report.toObject(),
      id: report._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;