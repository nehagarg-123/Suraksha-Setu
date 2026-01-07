import express from 'express';
import Responder from '../models/Responder.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/responders - Get all responders
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const responders = await Responder.find(query)
      .populate('user', 'name email phone')
      .populate('current_incident', 'type description status')
      .lean();

    return res.json(responders.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Responders list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/responders - Register as responder
router.post('/', requireAuth, async (req, res) => {
  try {
    // Check if user is already a responder
    const existing = await Responder.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'Already registered as responder' });
    }

    const responder = new Responder({
      user: req.user.id,
      ...req.body,
    });
    await responder.save();

    await responder.populate('user', 'name email phone');

    return res.status(201).json({
      ...responder.toObject(),
      id: responder._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Responder registration error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/responders/:id/location - Update responder location
router.put('/:id/location', requireAuth, async (req, res) => {
  try {
    const responder = await Responder.findById(req.params.id);
    if (!responder) {
      return res.status(404).json({ error: 'Responder not found' });
    }

    // Check authorization
    if (responder.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    responder.current_location = {
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      updated_at: new Date(),
    };
    responder.last_seen = new Date();
    await responder.save();

    // Emit location update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('responder-location-update', {
        ...responder.toObject(),
        id: responder._id.toString(),
        _id: undefined,
      });
    }

    return res.json({
      ...responder.toObject(),
      id: responder._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/responders/:id/status - Update responder status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const responder = await Responder.findById(req.params.id);
    if (!responder) {
      return res.status(404).json({ error: 'Responder not found' });
    }

    if (responder.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    responder.status = req.body.status;
    responder.last_seen = new Date();
    await responder.save();

    return res.json({
      ...responder.toObject(),
      id: responder._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;