import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function VolunteerRegistration({ token, showToast }) {
  const [form, setForm] = useState({
    skills: [],
    certifications: '',
    availability_status: 'available',
  });
  const [submitting, setSubmitting] = useState(false);

  const skills = ['medical', 'rescue', 'communication', 'logistics', 'technical', 'counseling', 'other'];

  const toggleSkill = (skill) => {
    setForm({
      ...form,
      skills: form.skills.includes(skill)
        ? form.skills.filter(s => s !== skill)
        : [...form.skills, skill],
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/volunteers`, {
        ...form,
        certifications: form.certifications.split(',').map(s => s.trim()).filter(s => s),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast?.('Volunteer registration submitted! Awaiting admin approval.', 'success');
      setForm({ skills: [], certifications: '', availability_status: 'available' });
    } catch (err) {
      console.error('Error registering volunteer:', err);
      showToast?.('Error registering as volunteer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3>🤝 Volunteer Registration</h3>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Register as a community responder to help during disasters
      </p>

      <form onSubmit={submit}>
        <label>Skills (select all that apply)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {skills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={form.skills.includes(skill) ? '' : 'secondary'}
              style={{ textTransform: 'capitalize' }}
            >
              {skill}
            </button>
          ))}
        </div>

        <label>Certifications (comma-separated)</label>
        <input
          value={form.certifications}
          onChange={(e) => setForm({ ...form, certifications: e.target.value })}
          placeholder="e.g., First Aid, CPR, Emergency Response"
        />

        <label>Availability Status</label>
        <select
          value={form.availability_status}
          onChange={(e) => setForm({ ...form, availability_status: e.target.value })}
        >
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Register as Volunteer'}
        </button>
      </form>
    </div>
  );
}