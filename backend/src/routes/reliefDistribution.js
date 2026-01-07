import express from 'express';
import ReliefDistribution from '../models/ReliefDistribution.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/relief-distribution
router.get('/', async (req, res) => {
  try {
    const { status, type, incident } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (incident) query.incident = incident;

    const distributions = await ReliefDistribution.find(query)
      .populate('distributed_by', 'name email')
      .populate('incident', 'type description')
      .sort({ created_at: -1 })
      .lean();

    return res.json(distributions.map(d => ({
      ...d,
      id: d._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Relief distribution list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/relief-distribution
router.post('/', requireAuth, async (req, res) => {
  try {
    const distribution = new ReliefDistribution({
      ...req.body,
      distributed_by: req.user.id,
    });
    await distribution.save();

    return res.status(201).json({
      ...distribution.toObject(),
      id: distribution._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Relief distribution create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/relief-distribution/:id/distribute - Record distribution to beneficiary
router.post('/:id/distribute', requireAuth, async (req, res) => {
  try {
    const { beneficiary_id, beneficiary_name, quantity, verified } = req.body;
    const distribution = await ReliefDistribution.findById(req.params.id);

    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    distribution.distributed_to.push({
      beneficiary_id,
      beneficiary_name,
      quantity,
      verified: verified || false,
      verified_at: verified ? new Date() : null,
    });

    await distribution.save();

    return res.json({
      ...distribution.toObject(),
      id: distribution._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/relief-distribution/:id/status - Update distribution status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const distribution = await ReliefDistribution.findById(req.params.id);

    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    distribution.status = status;
    if (status === 'completed') {
      distribution.completed_at = new Date();
    }
    await distribution.save();

    return res.json({
      ...distribution.toObject(),
      id: distribution._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;