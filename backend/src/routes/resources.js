
import express from 'express';
import Resource from '../models/Resource.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/resources - Get all resources
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const resources = await Resource.find(query)
      .populate('assigned_to', 'name email')
      .lean();

    return res.json(resources.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Resources list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/resources - Create resource (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const resource = new Resource(req.body);
    if (!resource.available_quantity) {
      resource.available_quantity = resource.quantity;
    }
    await resource.save();

    return res.status(201).json({
      ...resource.toObject(),
      id: resource._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Resource create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/resources/:id - Update resource
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.json({
      ...resource.toObject(),
      id: resource._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/resources/:id/assign - Assign resource to incident
router.post('/:id/assign', requireAuth, async (req, res) => {
  try {
    const { incident_id, quantity } = req.body;
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const assignQty = quantity || 1;
    if (resource.available_quantity < assignQty) {
      return res.status(400).json({ error: 'Insufficient quantity available' });
    }

    resource.available_quantity -= assignQty;
    resource.status = 'deployed';
    resource.assigned_to = req.user.id;
    await resource.save();

    return res.json({
      ...resource.toObject(),
      id: resource._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
