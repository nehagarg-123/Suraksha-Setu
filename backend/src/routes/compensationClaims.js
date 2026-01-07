import express from 'express';
import CompensationClaim from '../models/CompensationClaim.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/compensation-claims
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = {};
    // Users can only see their own claims unless admin
    if (req.user.role !== 'admin') {
      query.claimant = req.user.id;
    } else {
      const { status, claimant } = req.query;
      if (status) query.status = status;
      if (claimant) query.claimant = claimant;
    }

    const claims = await CompensationClaim.find(query)
      .populate('claimant', 'name email phone')
      .populate('incident', 'type description')
      .populate('reviewed_by', 'name')
      .sort({ created_at: -1 })
      .lean();

    return res.json(claims.map(c => ({
      ...c,
      id: c._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Compensation claims list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/compensation-claims
router.post('/', requireAuth, async (req, res) => {
  try {
    const claim = new CompensationClaim({
      ...req.body,
      claimant: req.user.id,
    });
    await claim.save();

    return res.status(201).json({
      ...claim.toObject(),
      id: claim._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Compensation claim create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/compensation-claims/:id/review - Review claim (admin only)
router.put('/:id/review', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, approved_amount, rejection_reason } = req.body;
    const claim = await CompensationClaim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    claim.status = status;
    claim.reviewed_by = req.user.id;
    claim.reviewed_at = new Date();
    if (approved_amount) claim.approved_amount = approved_amount;
    if (rejection_reason) claim.rejection_reason = rejection_reason;
    if (status === 'disbursed') {
      claim.disbursed_at = new Date();
    }

    await claim.save();

    return res.json({
      ...claim.toObject(),
      id: claim._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;