import express from 'express';
import Feedback from '../models/Feedback.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/feedback
router.get('/', async (req, res) => {
  try {
    const { incident } = req.query;
    const query = {};
    if (incident) query.incident = incident;

    const feedbacks = await Feedback.find(query)
      .populate('user', 'name email')
      .populate('incident', 'type description')
      .sort({ created_at: -1 })
      .lean();

    return res.json(feedbacks.map(f => ({
      ...f,
      id: f._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Feedback list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/feedback
router.post('/', requireAuth, async (req, res) => {
  try {
    const feedback = new Feedback({
      ...req.body,
      user: req.user.id,
    });
    await feedback.save();

    return res.status(201).json({
      ...feedback.toObject(),
      id: feedback._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error('Feedback create error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/feedback/stats - Get feedback statistics
router.get('/stats', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().lean();
    
    const stats = {
      total: feedbacks.length,
      average_rating: 0,
      average_response_time: 0,
      average_satisfaction: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (feedbacks.length > 0) {
      const totalRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
      const totalResponseTime = feedbacks.reduce((sum, f) => sum + (f.response_time_rating || 0), 0);
      const totalSatisfaction = feedbacks.reduce((sum, f) => sum + (f.satisfaction_rating || 0), 0);

      stats.average_rating = totalRating / feedbacks.length;
      stats.average_response_time = totalResponseTime / feedbacks.length;
      stats.average_satisfaction = totalSatisfaction / feedbacks.length;

      feedbacks.forEach(f => {
        if (f.rating) stats.rating_distribution[f.rating]++;
      });
    }

    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;