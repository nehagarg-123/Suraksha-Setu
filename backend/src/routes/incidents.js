
import express from 'express';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import IncidentChat from '../models/IncidentChat.js';
import { requireAuth } from '../middleware/auth.js';
import { createSystemAlert, notifyRegisteredUsers } from '../services/notificationService.js';
import { calculateIncidentPriority, extractKeywords } from '../services/incidentPriority.js';
import { clusterIncidents, generateClusterId } from '../services/incidentClustering.js';

const router = express.Router();

// GET /api/incidents
router.get('/', async (req, res) => {
  try {
    const { status, priority_min, type, cluster_id } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (priority_min) query.priority = { $gte: parseInt(priority_min) };
    if (type) query.type = type;
    if (cluster_id) query.cluster_id = cluster_id;

    const incidents = await Incident.find(query)
      .sort({ priority: -1, created_at: -1 })
      .populate('reported_by', 'name email')
      .populate('assigned_to', 'name email')
      .lean();
    
    // Convert _id to id for consistency
    const formattedIncidents = incidents.map(incident => ({
      ...incident,
      id: incident._id.toString(),
      _id: undefined,
    }));

    return res.json(formattedIncidents);
  } catch (err) {
    console.error('Incidents list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/incidents
router.post('/', requireAuth, async (req, res) => {
  const {
    type,
    severity,
    description,
    latitude,
    longitude,
    rain_mm,
    river_level_m,
    soil_moisture_pct,
    history_pct,
    wind_kmh,
  } = req.body;

  let risk_score = 0;
  let risk_level = 'SAFE';

  const severityUpper = (severity || '').toUpperCase();
  const severityDefaults = {
    CRITICAL: { score: 90, level: 'CRITICAL' },
    HIGH: { score: 75, level: 'HIGH' },
    MODERATE: { score: 55, level: 'MODERATE' },
    LOW: { score: 30, level: 'LOW' },
  };

  // Call ML service, but don't fail if it's down
  try {
    const ML_URL = process.env.ML_URL || 'http://localhost:5000/predict';

    const mlResp = await fetch(ML_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: severityUpper,
        latitude,
        longitude,
        rain_mm,
        river_level_m,
        soil_moisture_pct,
        history_pct,
        wind_kmh,
      }),
    });

    if (mlResp.ok) {
      const mlJson = await mlResp.json();
      if (typeof mlJson.risk_score === 'number') {
        risk_score = mlJson.risk_score;
      }
      if (typeof mlJson.level === 'string') {
        risk_level = mlJson.level;
      }
    } else {
      console.error('ML service status:', mlResp.status);
    }
  } catch (err) {
    console.error('Error calling ML service:', err);
  }

  // Fallback: if ML not reachable or returned low/zero, respect user severity.
  if (risk_score <= 0 && severityDefaults[severityUpper]) {
    risk_score = severityDefaults[severityUpper].score;
    risk_level = severityDefaults[severityUpper].level;
  }
  // If ML returned a numeric score but level is missing, derive from severity mapping.
  if (!risk_level && severityDefaults[severityUpper]) {
    risk_level = severityDefaults[severityUpper].level;
  }

  try {
    // Extract keywords and detect SOS
    const keywords = extractKeywords(description || '');
    const sosFlag = keywords.includes('sos') || keywords.includes('trapped') || 
                    (description || '').toLowerCase().includes('sos');

    // Check for duplicate/cluster
    let clusterId = null;
    if (latitude && longitude) {
      const recentIncidents = await Incident.find({
        latitude: { $gte: latitude - 0.01, $lte: latitude + 0.01 },
        longitude: { $gte: longitude - 0.01, $lte: longitude + 0.01 },
        created_at: { $gte: new Date(Date.now() - 3600000) }, // Last hour
      }).limit(5);

      if (recentIncidents.length > 0) {
        clusterId = recentIncidents[0].cluster_id || generateClusterId();
        // Update all incidents in cluster with same cluster_id
        await Incident.updateMany(
          { _id: { $in: recentIncidents.map(i => i._id) } },
          { $set: { cluster_id: clusterId } }
        );
      } else {
        clusterId = generateClusterId();
      }
    }

    const incident = new Incident({
      type: type || null,
      severity: severity || null,
      description: description || null,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      risk_score,
      risk_level,
      keywords,
      sos_flag: sosFlag,
      cluster_id: clusterId,
      media_attachments: req.body.media_attachments || [],
      offline_synced: req.body.offline_synced !== false,
      reported_by: req.user && mongoose.Types.ObjectId.isValid(req.user.id) 
        ? new mongoose.Types.ObjectId(req.user.id) 
        : null,
    });

    // Calculate priority
    const priority = calculateIncidentPriority({
      ...incident.toObject(),
      cluster_size: 1,
    });
    incident.priority = priority;
    incident.priority_calculated = true;

    await incident.save();
    console.log('✅ Incident saved to MongoDB:', {
      id: incident._id.toString(),
      type: incident.type,
      risk_level: incident.risk_level,
      priority: incident.priority,
      database: incident.constructor.db.name,
      collection: incident.constructor.collection.name
    });

    const io = req.app.get('io');

    // Auto-create system alert + notify registered users
    const alertMessage = `New ${incident.type || 'incident'} reported (${incident.risk_level} risk, severity ${incident.severity || 'N/A'}) at ${latitude ?? 'N/A'}, ${longitude ?? 'N/A'}. Priority ${incident.priority}.`;
    const notificationChannels = req.body.notify_channels || ['email', 'sms', 'in_app'];

    try {
      await createSystemAlert({
        message: alertMessage,
        level: incident.risk_level || 'MODERATE',
        source: 'incident',
        metadata: {
          incidentId: incident._id.toString(),
          type: incident.type,
          severity: incident.severity,
          priority: incident.priority,
          latitude,
          longitude,
        },
        io,
      });
    } catch (err) {
      console.error('System alert creation failed:', err);
    }

    notifyRegisteredUsers({
      title: `Incident alert: ${incident.type || 'General'}`,
      message: `${alertMessage}\nDetails: ${incident.description || 'No description provided.'}`,
      level: incident.risk_level || 'MODERATE',
      channels: notificationChannels,
      io,
      metadata: { incidentId: incident._id.toString() },
    }).catch(err => console.error('User notification failed:', err));

    // Convert to JSON format with id instead of _id
    const incidentObj = incident.toObject();
    const formattedIncident = {
      ...incidentObj,
      id: incidentObj._id.toString(),
      _id: undefined,
    };

    if (io) {
      io.emit('new-incident', formattedIncident);
    }

    return res.status(201).json(formattedIncident);
  } catch (err) {
    console.error('Incident insert error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Server error';
    if (err.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.values(err.errors).map(e => e.message).join(', ')}`;
    } else if (err.name === 'CastError') {
      errorMessage = `Invalid data format: ${err.message}`;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return res.status(500).json({ error: errorMessage });
  }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reported_by', 'name email')
      .populate('assigned_to', 'name email')
      .lean();

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    return res.json({
      ...incident,
      id: incident._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/incidents/:id/assign - Assign incident to responder
router.put('/:id/assign', requireAuth, async (req, res) => {
  try {
    const { responder_id } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'responder') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    incident.assigned_to = responder_id || req.user.id;
    incident.status = 'in_progress';
    incident.updated_at = new Date();
    await incident.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-updated', {
        ...incident.toObject(),
        id: incident._id.toString(),
        _id: undefined,
      });
    }

    return res.json({
      ...incident.toObject(),
      id: incident._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/incidents/:id/status - Update incident status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check authorization
    const isOwner = incident.reported_by?.toString() === req.user.id;
    const isAssigned = incident.assigned_to?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAssigned && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    incident.status = status;
    incident.updated_at = new Date();
    if (status === 'resolved') {
      incident.resolved_at = new Date();
    }
    await incident.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-updated', {
        ...incident.toObject(),
        id: incident._id.toString(),
        _id: undefined,
      });
    }

    return res.json({
      ...incident.toObject(),
      id: incident._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/incidents/:id/chat - Add message to incident chat
router.post('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { message, attachments } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const chatMessage = new IncidentChat({
      incident: incident._id,
      sender: req.user.id,
      sender_role: req.user.role === 'admin' ? 'admin' : 
                   req.user.role === 'responder' ? 'responder' : 'citizen',
      message,
      attachments: attachments || [],
    });

    await chatMessage.save();
    await chatMessage.populate('sender', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-chat', {
        ...chatMessage.toObject(),
        id: chatMessage._id.toString(),
        _id: undefined,
      });
    }

    return res.status(201).json({
      ...chatMessage.toObject(),
      id: chatMessage._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/incidents/:id/chat - Get incident chat messages
router.get('/:id/chat', async (req, res) => {
  try {
    const messages = await IncidentChat.find({ incident: req.params.id })
      .populate('sender', 'name email')
      .sort({ created_at: 1 })
      .lean();

    return res.json(messages.map(m => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/incidents/cluster - Cluster incidents
router.post('/cluster', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { radius_km = 2 } = req.body;
    const incidents = await Incident.find({
      latitude: { $exists: true },
      longitude: { $exists: true },
      created_at: { $gte: new Date(Date.now() - 24 * 3600000) }, // Last 24 hours
    }).lean();

    const clusters = clusterIncidents(incidents, radius_km);
    
    // Update incidents with cluster IDs
    for (const cluster of clusters) {
      const clusterId = generateClusterId();
      const incidentIds = cluster.map(c => c._id);
      await Incident.updateMany(
        { _id: { $in: incidentIds } },
        { $set: { cluster_id: clusterId } }
      );
    }

    return res.json({
      clusters_found: clusters.length,
      incidents_clustered: clusters.reduce((sum, c) => sum + c.length, 0),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;