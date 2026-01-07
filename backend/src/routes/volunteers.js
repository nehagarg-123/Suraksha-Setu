
import express from 'express';
import Volunteer from '../models/Volunteer.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/volunteers - Get all volunteers
router.get('/', async (req, res) => {
  try {
    const { approved, availability_status } = req.query;
    const query = {};
    if (approved !== undefined) query.approved = approved === 'true';
    if (availability_status) query.availability_status = availability_status;

    const volunteers = await Volunteer.find(query)
      .populate('user', 'name email phone')
      .populate('approved_by', 'name')
      .lean();

    return res.json(volunteers.map(v => ({
      ...v,
      id: v._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Volunteers list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/volunteers - Register as volunteer
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check if already registered
    const existing = await Volunteer.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'Already registered as volunteer' });
    }

    const volunteer = new Volunteer({
      user: req.user.id,
      ...req.body,
    });
    await volunteer.save();

    await volunteer.populate('user', 'name email phone');

    return res.status(201).json({
      ...volunteer.toObject(),
      id: volunteer._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Volunteer registration error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/volunteers/:id/approve - Approve volunteer (admin only)
router.put('/:id/approve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    volunteer.approved = true;
    volunteer.approved_by = req.user.id;
    volunteer.approved_at = new Date();
    await volunteer.save();

    await volunteer.populate('user', 'name email phone');

    return res.json({
      ...volunteer.toObject(),
      id: volunteer._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/volunteers/:id/status - Update availability status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Check if user owns this volunteer record or is admin
    if (volunteer.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    volunteer.availability_status = req.body.availability_status;
    if (req.body.location) {
      volunteer.location = req.body.location;
    }
    await volunteer.save();

    return res.json({
      ...volunteer.toObject(),
      id: volunteer._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
