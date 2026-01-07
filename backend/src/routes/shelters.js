import express from 'express';
import Shelter from '../models/Shelter.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/shelters - Get all shelters
router.get('/', async (req, res) => {
  try {
    const { is_active, latitude, longitude, radius } = req.query;
    const query = {};
    
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    let shelters = await Shelter.find(query).lean();

    // Filter by radius if location provided
    if (latitude && longitude && radius) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const rad = parseFloat(radius);
      
      shelters = shelters.filter(s => {
        const distance = calculateDistance(lat, lon, s.latitude, s.longitude);
        return distance <= rad;
      });
    }

    return res.json(shelters.map(s => ({
      ...s,
      id: s._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Shelters list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/shelters - Create new shelter (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const shelter = new Shelter(req.body);
    await shelter.save();

    return res.status(201).json({
      ...shelter.toObject(),
      id: shelter._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Shelter create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/shelters/:id - Update shelter
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const shelter = await Shelter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!shelter) {
      return res.status(404).json({ error: 'Shelter not found' });
    }

    return res.json({
      ...shelter.toObject(),
      id: shelter._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export default router;