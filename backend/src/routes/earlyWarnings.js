import express from 'express';
import EarlyWarning from '../models/EarlyWarning.js';
import { calculateRiskScore, detectHazardType } from '../services/riskScoring.js';
import { requireAuth } from '../middleware/auth.js';
import { createSystemAlert, notifyRegisteredUsers } from '../services/notificationService.js';

const router = express.Router();

// GET /api/early-warnings - Get all active warnings
router.get('/', async (req, res) => {
  try {
    const { type, status = 'active' } = req.query;
    const query = { status };
    if (type) query.type = type;

    const warnings = await EarlyWarning.find(query)
      .sort({ triggered_at: -1 })
      .lean();

    return res.json(warnings.map(w => ({
      ...w,
      id: w._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Early warnings list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/early-warnings/check - Check for warnings at a location
router.post('/check', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    const riskData = await calculateRiskScore({ latitude, longitude });
    const hazards = detectHazardType(riskData.weather_data, { latitude, longitude });

    // Create warnings for detected hazards
    const warnings = [];
    for (const hazard of hazards) {
      if (hazard.confidence > 0.6) {
        const warning = new EarlyWarning({
          type: hazard.type,
          severity: riskData.risk_level,
          location: { latitude, longitude },
          risk_score: riskData.risk_score,
          weather_data: riskData.weather_data,
          predicted_impact: `Potential ${hazard.type} detected with ${Math.round(hazard.confidence * 100)}% confidence`,
        });
        await warning.save();
        warnings.push(warning);

        // Broadcast alerts only for higher risk levels to avoid noise
        const io = req.app.get('io');
        if (['HIGH', 'CRITICAL'].includes(riskData.risk_level)) {
          try {
            await createSystemAlert({
              message: `Early warning: ${hazard.type} (${riskData.risk_level}) near ${latitude}, ${longitude}.`,
              level: riskData.risk_level,
              source: 'early_warning',
              metadata: {
                warningId: warning._id.toString(),
                latitude,
                longitude,
                hazard: hazard.type,
              },
              io,
            });
          } catch (err) {
            console.error('Early warning alert creation failed:', err);
          }

          notifyRegisteredUsers({
            title: `Early warning: ${hazard.type}`,
            message: `Risk level ${riskData.risk_level} detected at ${latitude}, ${longitude}. Impact: ${warning.predicted_impact}`,
            level: riskData.risk_level,
            channels: ['email', 'sms', 'in_app'],
            io,
            metadata: { warningId: warning._id.toString() },
          }).catch(err => console.error('Early warning notification failed:', err));
        }
      }
    }

    return res.json({
      risk_score: riskData.risk_score,
      risk_level: riskData.risk_level,
      hazards,
      warnings: warnings.map(w => ({
        ...w.toObject(),
        id: w._id.toString(),
        _id: undefined,
      })),
    });
  } catch (err) {
    console.error('Early warning check error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/early-warnings/:id
router.get('/:id', async (req, res) => {
  try {
    const warning = await EarlyWarning.findById(req.params.id).lean();
    if (!warning) {
      return res.status(404).json({ error: 'Warning not found' });
    }
    return res.json({
      ...warning,
      id: warning._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/early-warnings/:id/resolve - Mark warning as resolved
router.put('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const warning = await EarlyWarning.findById(req.params.id);
    if (!warning) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    warning.status = 'resolved';
    warning.resolved_at = new Date();
    await warning.save();

    return res.json({
      ...warning.toObject(),
      id: warning._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;