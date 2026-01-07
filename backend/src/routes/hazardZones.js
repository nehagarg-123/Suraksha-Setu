import express from 'express';
import HazardZone from '../models/HazardZone.js';
import { requireAuth } from '../middleware/auth.js';
import { createSystemAlert, notifyRegisteredUsers } from '../services/notificationService.js';

const router = express.Router();

// GET /api/hazard-zones - Get all hazard zones
router.get('/', async (req, res) => {
  try {
    const { type, is_active } = req.query;
    const query = {};
    if (type) query.type = type;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const zones = await HazardZone.find(query).lean();

    return res.json(zones.map(z => ({
      ...z,
      id: z._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Hazard zones list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/hazard-zones - Create hazard zone (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const zone = new HazardZone(req.body);
    await zone.save();

    const io = req.app.get('io');
    const shouldNotify = ['HIGH', 'CRITICAL'].includes(zone.risk_level);

    if (shouldNotify) {
      try {
        await createSystemAlert({
          message: `Hazard zone "${zone.name}" set to ${zone.risk_level}. Type: ${zone.type}`,
          level: zone.risk_level,
          source: 'hazard',
          metadata: { zoneId: zone._id.toString(), type: zone.type },
          io,
        });
      } catch (err) {
        console.error('Hazard alert creation failed:', err);
      }

      notifyRegisteredUsers({
        title: `Hazard alert: ${zone.name}`,
        message: `Risk level ${zone.risk_level} for ${zone.type}. ${zone.description || ''}`.trim(),
        level: zone.risk_level,
        channels: req.body.notify_channels || ['email', 'sms', 'in_app'],
        io,
        metadata: { zoneId: zone._id.toString() },
      }).catch(err => console.error('Hazard notification failed:', err));
    }

    return res.status(201).json({
      ...zone.toObject(),
      id: zone._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Hazard zone create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/hazard-zones/:id - Update hazard zone
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const zone = await HazardZone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!zone) {
      return res.status(404).json({ error: 'Hazard zone not found' });
    }

    return res.json({
      ...zone.toObject(),
      id: zone._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;