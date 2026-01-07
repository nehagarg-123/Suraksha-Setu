// src/components/IncidentForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { isOnline, addToOfflineQueue, syncQueue } from '../utils/offlineQueue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function IncidentForm({ token, onCreated, showToast }) {
  const [form, setForm] = useState({
    type: '',
    severity: 'LOW',
    description: '',
    latitude: '',
    longitude: '',
    rain_mm: '',
    river_level_m: '',
    soil_moisture_pct: '',
    history_pct: '',
    wind_kmh: '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showEnv, setShowEnv] = useState(false); // toggle for optional section
  const [mediaFiles, setMediaFiles] = useState([]);
  const [sosFlag, setSosFlag] = useState(false);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.type.trim()) {
      newErrors.type = 'Incident type is required';
    }
    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast?.('Please fill in all required fields', 'error');
      return;
    }

    // Check if token exists
    if (!token) {
      showToast?.('Authentication required. Please log in again.', 'error');
      return;
    }

    setSaving(true);
    
    // Handle media uploads (simplified - in production, upload to cloud storage first)
    const mediaAttachments = mediaFiles.map((file, idx) => ({
      url: URL.createObjectURL(file), // In production, use actual uploaded URL
      type: file.type.startsWith('image/') ? 'image' : 'video',
      uploaded_at: new Date().toISOString(),
    }));

    // Helper function to safely convert to number
    const toNumber = (value) => {
      if (!value || (typeof value === 'string' && !value.trim())) return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    // Clean up payload - convert empty strings to null/0
    const payload = {
      type: form.type.trim(),
      severity: form.severity || 'LOW',
      description: form.description.trim(),
      latitude: toNumber(form.latitude),
      longitude: toNumber(form.longitude),
      rain_mm: toNumber(form.rain_mm) ?? 0,
      river_level_m: toNumber(form.river_level_m) ?? 0,
      soil_moisture_pct: toNumber(form.soil_moisture_pct) ?? 0,
      history_pct: toNumber(form.history_pct) ?? 0,
      wind_kmh: toNumber(form.wind_kmh) ?? 0,
      media_attachments: mediaAttachments,
      sos_flag: sosFlag || (form.description && (
        form.description.toLowerCase().includes('sos') || 
        form.description.toLowerCase().includes('trapped')
      )),
    };

    // Check if online
    if (!isOnline()) {
      // Add to offline queue
      addToOfflineQueue(payload);
      showToast?.(
        '⚠️ You are offline. Incident queued for sync when connection is restored.',
        'warning',
      );
      setSaving(false);
      return;
    }

    try {
      console.log('Submitting incident with payload:', { ...payload, media_attachments: `[${mediaAttachments.length} files]` });
      const { data } = await axios.post(`${API_BASE}/api/incidents`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (onCreated) onCreated(data);

      showToast?.(
        `Incident reported! Risk level: ${data.risk_level} (Score: ${data.risk_score})`,
        'success',
      );

      // Reset form completely
      setForm({
        type: '',
        severity: 'LOW',
        description: '',
        latitude: '',
        longitude: '',
        rain_mm: '',
        river_level_m: '',
        soil_moisture_pct: '',
        history_pct: '',
        wind_kmh: '',
      });
      setMediaFiles([]);
      setSosFlag(false);
      setErrors({});
      setShowEnv(false);
    } catch (err) {
      console.error('Incident creation error:', err);
      let message = 'Failed to create incident';
      
      if (err.response) {
        // Server responded with error
        const status = err.response.status;
        const errorData = err.response.data;
        
        // Handle authentication errors
        if (status === 401) {
          message = 'Your session has expired. Please log in again.';
          showToast?.(message, 'error');
          
          // Clear auth and redirect to login after a short delay
          setTimeout(() => {
            localStorage.removeItem('sahayata_auth');
            window.location.reload();
          }, 2000);
          return;
        }
        
        message = errorData?.error || 
                  errorData?.message || 
                  `Server error: ${status} ${err.response.statusText}`;
      } else if (err.request) {
        // Request made but no response
        message = 'No response from server. Please check your connection.';
      } else {
        // Error setting up request
        message = err.message || 'Failed to create incident';
      }
      
      showToast?.(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3>📝 Report Incident</h3>
      <p
        className="muted"
        style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}
      >
        Report a new disaster incident with location and details
      </p>
      <form onSubmit={submit}>
        <label>Incident Type *</label>
        <input
          placeholder="e.g., Flooding, Landslide, Earthquake, Fire"
          value={form.type}
          onChange={update('type')}
          className={errors.type ? 'error' : ''}
        />
        {errors.type && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
            {errors.type}
          </span>
        )}

        <label>Severity Level</label>
        <select value={form.severity} onChange={update('severity')}>
          <option value="LOW">🟢 Low</option>
          <option value="MODERATE">🟡 Moderate</option>
          <option value="HIGH">🟠 High</option>
          <option value="CRITICAL">🔴 Critical</option>
        </select>

        <label>Description *</label>
        <textarea
          value={form.description}
          onChange={update('description')}
          placeholder="Provide a detailed description of the incident..."
          className={errors.description ? 'error' : ''}
        />
        {errors.description && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>
            {errors.description}
          </span>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={sosFlag}
            onChange={(e) => setSosFlag(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span>🚨 SOS / Emergency Flag (High Priority)</span>
        </label>

        <label>Media Attachments (Photos/Videos)</label>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => setMediaFiles(Array.from(e.target.files))}
        />
        {mediaFiles.length > 0 && (
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {mediaFiles.length} file(s) selected
          </div>
        )}

        <div className="field-row">
          <div>
            <label>Latitude</label>
            <input
              value={form.latitude}
              onChange={update('latitude')}
              placeholder="e.g. 26.9124"
            />
          </div>
          <div>
            <label>Longitude</label>
            <input
              value={form.longitude}
              onChange={update('longitude')}
              placeholder="e.g. 75.7873"
            />
          </div>
        </div>

        {/* Toggle button for optional section */}
        <button
          type="button"
          onClick={() => setShowEnv((prev) => !prev)}
          className="optional-toggle"
        >
          <span>
             Optional environmental data
            <span className="muted"> </span>
          </span>
          <span className={`chevron ${showEnv ? 'rotated' : ''}`}>▼</span>
        </button>

        {/* Optional fields – only shown when expanded */}
        {showEnv && (
          <>
            <div className="field-row">
              <div>
                <label>Rain (mm, 24h)</label>
                <input
                  value={form.rain_mm}
                  onChange={update('rain_mm')}
                  placeholder="e.g. 120"
                />
              </div>
              <div>
                <label>River level (m)</label>
                <input
                  value={form.river_level_m}
                  onChange={update('river_level_m')}
                  placeholder="e.g. 4.2"
                />
              </div>
            </div>

            <div className="field-row">
              <div>
                <label>Soil moisture (%)</label>
                <input
                  value={form.soil_moisture_pct}
                  onChange={update('soil_moisture_pct')}
                  placeholder="0-100"
                />
              </div>
              <div>
                <label>Historical risk (%)</label>
                <input
                  value={form.history_pct}
                  onChange={update('history_pct')}
                  placeholder="0-100"
                />
              </div>
            </div>

            <label>Wind speed (km/h)</label>
            <input
              value={form.wind_kmh}
              onChange={update('wind_kmh')}
              placeholder="e.g. 45"
            />
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {saving ? (
            <>
              <span className="loading-spinner"></span>
              Submitting…
            </>
          ) : (
            '🚨 Submit Incident'
          )}
        </button>
      </form>
    </div>
  );
}