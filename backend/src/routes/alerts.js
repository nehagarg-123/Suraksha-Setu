import express from 'express';
import Alert from '../models/Alert.js';
import { requireAuth } from '../middleware/auth.js';
import { testEmailConfiguration, notifyRegisteredUsers, createSystemAlert } from '../services/notificationService.js';

const router = express.Router();

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { level } = req.query;
    const query = {};
    if (level) query.level = level;

    const alerts = await Alert.find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    return res.json(alerts.map(a => ({
      ...a,
      id: a._id.toString(),
      _id: undefined,
    })));
  } catch (err) {
    console.error('Alerts list error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/alerts/broadcast - Broadcast alert (admin only)
router.post('/broadcast', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { message, level = 'MODERATE', channels = ['email', 'sms', 'in_app'], title } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const io = req.app.get('io');

    // Create system alert in database
    const alert = await createSystemAlert({
      message,
      level,
      source: 'manual',
      metadata: {},
      io,
    });

    // Send notifications via email, SMS, and in-app
    let notificationResults = null;
    try {
      notificationResults = await notifyRegisteredUsers({
        title: title || `Alert: ${level}`,
        message,
        level,
        channels: channels || ['email', 'sms', 'in_app'],
        io,
        metadata: { alertId: alert._id.toString() },
      });
      console.log('📧 Notification results:', notificationResults);
    } catch (notifyErr) {
      console.error('⚠️ Notification error (alert still saved):', notifyErr);
      // Don't fail the request if notifications fail - alert is still saved
    }

    return res.status(201).json({
      ...alert.toObject(),
      id: alert._id.toString(),
      _id: undefined,
      channels_sent: channels,
      notifications: notificationResults,
    });
  } catch (err) {
    console.error('Alert broadcast error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/alerts/test-email - Test email configuration
router.post('/test-email', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const result = await testEmailConfiguration(email);
    
    if (result.success) {
      return res.json({ 
        success: true, 
        message: result.message,
        messageId: result.messageId 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: result.message 
      });
    }
  } catch (err) {
    console.error('Email test error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/alerts/status - Get notification service status (admin only)
router.get('/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const User = (await import('../models/User.js')).default;
    const users = await User.find({}, 'email phone name').lean();
    const emails = users.filter(u => u.email && typeof u.email === 'string' && u.email.trim().length > 0).map(u => u.email.trim());
    const phones = users.filter(u => u.phone && (typeof u.phone === 'string' || typeof u.phone === 'number') && String(u.phone).trim().length > 0);

    return res.json({
      email: {
        enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        smtpHost: process.env.SMTP_HOST || 'NOT SET',
        smtpPort: process.env.SMTP_PORT || '587 (default)',
        smtpUser: process.env.SMTP_USER ? 'SET' : 'NOT SET',
        smtpPass: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
        fromAddress: process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER || 'NOT SET',
      },
      sms: {
        enabled: Boolean(process.env.SMS_WEBHOOK_URL),
        webhookUrl: process.env.SMS_WEBHOOK_URL ? 'SET' : 'NOT SET',
      },
      users: {
        total: users.length,
        withEmail: emails.length,
        withPhone: phones.length,
      },
    });
  } catch (err) {
    console.error('Status check error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;