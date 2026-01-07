import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function DamageAssessment({ token, incidentId, showToast }) {
  const [form, setForm] = useState({
    building_condition: '',
    crop_damage: '',
    electricity_status: '',
    infrastructure_status: {
      roads: '',
      bridges: '',
      water_supply: '',
    },
    estimated_loss: '',
    location: { latitude: '', longitude: '', address: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    if (field.startsWith('infrastructure_status.')) {
      const subField = field.split('.')[1];
      setForm({
        ...form,
        infrastructure_status: {
          ...form.infrastructure_status,
          [subField]: e.target.value,
        },
      });
    } else {
      setForm({ ...form, [field]: e.target.value });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE}/api/damage-reports`,
        {
          ...form,
          incident: incidentId,
          location: {
            latitude: form.location.latitude ? parseFloat(form.location.latitude) : null,
            longitude: form.location.longitude ? parseFloat(form.location.longitude) : null,
            address: form.location.address,
          },
          estimated_loss: form.estimated_loss ? parseFloat(form.estimated_loss) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast?.('Damage assessment submitted successfully', 'success');
      setForm({
        building_condition: '',
        crop_damage: '',
        electricity_status: '',
        infrastructure_status: { roads: '', bridges: '', water_supply: '' },
        estimated_loss: '',
        location: { latitude: '', longitude: '', address: '' },
      });
    } catch (err) {
      console.error('Error submitting damage assessment:', err);
      showToast?.('Error submitting damage assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3>📊 Damage Assessment</h3>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Report damage to buildings, infrastructure, and crops
      </p>

      <form onSubmit={submit}>
        <label>Building Condition</label>
        <select value={form.building_condition} onChange={update('building_condition')}>
          <option value="">Select...</option>
          <option value="intact">Intact</option>
          <option value="minor_damage">Minor Damage</option>
          <option value="moderate_damage">Moderate Damage</option>
          <option value="severe_damage">Severe Damage</option>
          <option value="destroyed">Destroyed</option>
        </select>

        <label>Crop Damage</label>
        <select value={form.crop_damage} onChange={update('crop_damage')}>
          <option value="">Select...</option>
          <option value="none">None</option>
          <option value="minor">Minor</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="total_loss">Total Loss</option>
        </select>

        <label>Electricity Status</label>
        <select value={form.electricity_status} onChange={update('electricity_status')}>
          <option value="">Select...</option>
          <option value="functional">Functional</option>
          <option value="intermittent">Intermittent</option>
          <option value="down">Down</option>
        </select>

        <h4 style={{ fontSize: '0.9rem', marginTop: '1rem', marginBottom: '0.5rem', color: '#f3f4f6' }}>Infrastructure Status</h4>

        <label>Roads</label>
        <select value={form.infrastructure_status.roads} onChange={update('infrastructure_status.roads')}>
          <option value="">Select...</option>
          <option value="passable">Passable</option>
          <option value="damaged">Damaged</option>
          <option value="blocked">Blocked</option>
        </select>

        <label>Bridges</label>
        <select value={form.infrastructure_status.bridges} onChange={update('infrastructure_status.bridges')}>
          <option value="">Select...</option>
          <option value="functional">Functional</option>
          <option value="damaged">Damaged</option>
          <option value="collapsed">Collapsed</option>
        </select>

        <label>Water Supply</label>
        <select value={form.infrastructure_status.water_supply} onChange={update('infrastructure_status.water_supply')}>
          <option value="">Select...</option>
          <option value="normal">Normal</option>
          <option value="limited">Limited</option>
          <option value="disrupted">Disrupted</option>
        </select>

        <label>Estimated Loss (₹)</label>
        <input
          type="number"
          value={form.estimated_loss}
          onChange={update('estimated_loss')}
          placeholder="Enter estimated loss amount"
        />

        <label>Location Address</label>
        <input
          value={form.location.address}
          onChange={(e) => setForm({ ...form, location: { ...form.location, address: e.target.value } })}
          placeholder="Address of damaged area"
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Damage Assessment'}
        </button>
      </form>
    </div>
  );
}