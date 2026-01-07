import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function EarlyWarningPanel() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [location, setLocation] = useState({ lat: '', lon: '' });

  useEffect(() => {
    loadWarnings();
  }, []);

  const loadWarnings = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/early-warnings?status=active`);
      setWarnings(data);
    } catch (err) {
      console.error('Error loading warnings:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkLocation = async () => {
    if (!location.lat || !location.lon) {
      alert('Please enter latitude and longitude');
      return;
    }

    setChecking(true);
    try {
      const { data } = await axios.post(`${API_BASE}/api/early-warnings/check`, {
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lon),
      });
      
      if (data.warnings && data.warnings.length > 0) {
        alert(`⚠️ ${data.warnings.length} warning(s) detected! Risk Level: ${data.risk_level}`);
        loadWarnings();
      } else {
        alert(`✅ Location appears safe. Risk Score: ${data.risk_score}/5`);
      }
    } catch (err) {
      console.error('Error checking location:', err);
      alert('Error checking location');
    } finally {
      setChecking(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      default: return '#22c55e';
    }
  };

  return (
    <div className="card">
      <h3>⚠️ Early Warning System</h3>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        AI-powered risk detection for floods, cyclones, landslides, and more
      </p>

      <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(31, 41, 55, 0.6)', borderRadius: '8px', border: '1px solid rgba(55, 65, 81, 0.5)' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#e5e7eb' }}>Check Location Risk</h4>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="number"
            placeholder="Latitude"
            value={location.lat}
            onChange={(e) => setLocation({ ...location, lat: e.target.value })}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            placeholder="Longitude"
            value={location.lon}
            onChange={(e) => setLocation({ ...location, lon: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>
        <button
          onClick={checkLocation}
          disabled={checking}
          style={{ width: '100%' }}
        >
          {checking ? 'Checking...' : '🔍 Check Risk'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : warnings.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
          No active warnings
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {warnings.map((w) => (
            <div
              key={w.id}
              style={{
                padding: '0.75rem',
                border: `2px solid ${getSeverityColor(w.severity)}`,
                borderRadius: '8px',
                background: `${getSeverityColor(w.severity)}15`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ textTransform: 'capitalize' }}>{w.type}</strong>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: getSeverityColor(w.severity),
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                  }}
                >
                  {w.severity}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0', color: '#e5e7eb' }}>{w.predicted_impact}</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                Risk Score: {w.risk_score}/5 • {new Date(w.triggered_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}