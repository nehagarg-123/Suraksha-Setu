import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function levelClass(level) {
  const key = (level || '').toUpperCase();
  if (key === 'CRITICAL') return 'badge critical';
  if (key === 'HIGH') return 'badge high';
  if (key === 'MODERATE') return 'badge moderate';
  return 'badge safe';
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/incidents`)
      .then((res) => {
        setIncidents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const stats = {
    total: incidents.length,
    critical: incidents.filter((i) => (i.risk_level || '').toUpperCase() === 'CRITICAL').length,
    high: incidents.filter((i) => (i.risk_level || '').toUpperCase() === 'HIGH').length,
    moderate: incidents.filter((i) => (i.risk_level || '').toUpperCase() === 'MODERATE').length,
  };

  return (
    <>
      <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {stats.critical}
          </div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {stats.high}
          </div>
          <div className="stat-label">High Risk</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {stats.moderate}
          </div>
          <div className="stat-label">Moderate</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="top-row">
          <h3>📋 Recent Incidents</h3>
          <span className="muted">
            {incidents.length === 0
              ? 'No incidents reported yet'
              : `${incidents.length} recorded`}
          </span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="loading-spinner"></span>
            <p className="muted" style={{ marginTop: '0.5rem' }}>Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="muted">No incidents have been reported yet. Be the first to report one!</p>
          </div>
        ) : (
          <ul className="incident-list">
            {incidents.map((i) => (
              <li key={i.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span className={levelClass(i.risk_level)}>
                    {i.risk_level || 'SAFE'}
                  </span>
                  <strong>{i.type || 'Incident'}</strong>
                  {typeof i.risk_score === 'number' && (
                    <span className="muted" style={{ marginLeft: 'auto' }}>
                      Score: {i.risk_score}
                    </span>
                  )}
                </div>
                <span style={{ opacity: 0.85, fontSize: '0.875rem' }}>{i.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}