import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function AnalyticsDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [incidentsRes, feedbackRes] = await Promise.all([
        axios.get(`${API_BASE}/api/incidents`),
        axios.get(`${API_BASE}/api/feedback/stats`),
      ]);

      const incidents = incidentsRes.data;
      const feedback = feedbackRes.data;

      // Calculate incident stats
      const incidentStats = {
        total: incidents.length,
        by_status: {
          reported: incidents.filter(i => i.status === 'reported').length,
          in_progress: incidents.filter(i => i.status === 'in_progress').length,
          resolved: incidents.filter(i => i.status === 'resolved').length,
        },
        by_type: {},
        average_response_time: 0, // Would calculate from timestamps
      };

      incidents.forEach(inc => {
        const type = inc.type || 'other';
        incidentStats.by_type[type] = (incidentStats.by_type[type] || 0) + 1;
      });

      setStats({
        incidents: incidentStats,
        feedback,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="loading-spinner"></span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>📈 Analytics Dashboard</h3>
        <p className="muted">System performance and response metrics</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats?.incidents.total || 0}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.incidents.by_status.resolved || 0}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats?.feedback.average_rating ? stats.feedback.average_rating.toFixed(1) : 'N/A'}
          </div>
          <div className="stat-label">Avg Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats?.feedback.total || 0}
          </div>
          <div className="stat-label">Feedback Responses</div>
        </div>
      </div>

      <div className="card">
        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#f3f4f6' }}>Incidents by Status</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}>
            <span>Reported</span>
            <strong>{stats?.incidents.by_status.reported || 0}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}>
            <span>In Progress</span>
            <strong>{stats?.incidents.by_status.in_progress || 0}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e5e7eb' }}>
            <span>Resolved</span>
            <strong>{stats?.incidents.by_status.resolved || 0}</strong>
          </div>
        </div>
      </div>

      {stats?.feedback.rating_distribution && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#f3f4f6' }}>Rating Distribution</h4>
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '20px', color: '#e5e7eb' }}>{rating}⭐</span>
              <div style={{ flex: 1, height: '20px', background: 'rgba(55, 65, 81, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(stats.feedback.rating_distribution[rating] / stats.feedback.total) * 100}%`,
                    background: rating >= 4 ? '#22c55e' : rating >= 3 ? '#eab308' : '#ef4444',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                {stats.feedback.rating_distribution[rating] || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
