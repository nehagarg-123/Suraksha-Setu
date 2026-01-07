import express from 'express';
import Incident from '../models/Incident.js';
import DamageReport from '../models/DamageReport.js';
import ReliefDistribution from '../models/ReliefDistribution.js';
import Feedback from '../models/Feedback.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/generate - Generate PDF report (admin only)
router.get('/generate', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { start_date, end_date, type = 'summary' } = req.query;

    // Fetch data
    const query = {};
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    const [incidents, damageReports, reliefDistributions, feedbacks] = await Promise.all([
      Incident.find(query).lean(),
      DamageReport.find(query).lean(),
      ReliefDistribution.find(query).lean(),
      Feedback.find(query).lean(),
    ]);

    // Calculate statistics
    const stats = {
      period: {
        start: start_date || 'All time',
        end: end_date || 'Present',
      },
      incidents: {
        total: incidents.length,
        by_status: {
          reported: incidents.filter(i => i.status === 'reported').length,
          in_progress: incidents.filter(i => i.status === 'in_progress').length,
          resolved: incidents.filter(i => i.status === 'resolved').length,
        },
        by_type: {},
        by_severity: {},
      },
      damage: {
        total_reports: damageReports.length,
        verified: damageReports.filter(d => d.verified).length,
        total_estimated_loss: damageReports.reduce((sum, d) => sum + (d.estimated_loss || 0), 0),
      },
      relief: {
        total_distributions: reliefDistributions.length,
        completed: reliefDistributions.filter(r => r.status === 'completed').length,
      },
      feedback: {
        total: feedbacks.length,
        average_rating: feedbacks.length > 0
          ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.length
          : 0,
      },
    };

    // Calculate incident type distribution
    incidents.forEach(inc => {
      const type = inc.type || 'other';
      stats.incidents.by_type[type] = (stats.incidents.by_type[type] || 0) + 1;
    });

    // Calculate severity distribution
    incidents.forEach(inc => {
      const severity = inc.severity || 'unknown';
      stats.incidents.by_severity[severity] = (stats.incidents.by_severity[severity] || 0) + 1;
    });

    // Generate simple text report (in production, use PDF library like pdfkit or puppeteer)
    const reportText = generateTextReport(stats);

    // Return JSON for now (frontend can format as PDF)
    return res.json({
      report: reportText,
      statistics: stats,
      generated_at: new Date().toISOString(),
      generated_by: req.user.id,
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

function generateTextReport(stats) {
  return `
DISASTER RESPONSE SYSTEM - OFFICIAL REPORT
==========================================

Period: ${stats.period.start} to ${stats.period.end}
Generated: ${new Date().toISOString()}

INCIDENTS SUMMARY
-----------------
Total Incidents: ${stats.incidents.total}
- Reported: ${stats.incidents.by_status.reported}
- In Progress: ${stats.incidents.by_status.in_progress}
- Resolved: ${stats.incidents.by_status.resolved}

DAMAGE ASSESSMENT
-----------------
Total Damage Reports: ${stats.damage.total_reports}
Verified Reports: ${stats.damage.verified}
Total Estimated Loss: ₹${stats.damage.total_estimated_loss.toLocaleString()}

RELIEF DISTRIBUTION
-------------------
Total Distributions: ${stats.relief.total_distributions}
Completed: ${stats.relief.completed}

CITIZEN FEEDBACK
----------------
Total Responses: ${stats.feedback.total}
Average Rating: ${stats.feedback.average_rating.toFixed(1)}/5

==========================================
End of Report
`;
}

export default router;