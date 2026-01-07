import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function ResourceManagement({ token, user }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'boat',
    name: '',
    quantity: 1,
    location: { latitude: '', longitude: '', address: '' },
    status: 'available',
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/resources`);
      setResources(data);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitResource = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/resources`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowForm(false);
      setForm({ type: 'boat', name: '', quantity: 1, location: { latitude: '', longitude: '', address: '' }, status: 'available' });
      loadResources();
    } catch (err) {
      console.error('Error creating resource:', err);
      alert('Error creating resource');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>🚁 Resource Management</h3>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="secondary" style={{ fontSize: '0.85rem' }}>
            {showForm ? 'Cancel' : '+ Add Resource'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={submitResource} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(31, 41, 55, 0.6)', borderRadius: '8px', border: '1px solid rgba(55, 65, 81, 0.5)' }}>
          <label>Resource Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="boat">Boat</option>
            <option value="ambulance">Ambulance</option>
            <option value="rescue_team">Rescue Team</option>
            <option value="medical_kit">Medical Kit</option>
            <option value="food_packet">Food Packet</option>
            <option value="water">Water</option>
            <option value="other">Other</option>
          </select>

          <label>Name/Description</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Rescue Boat #1"
            required
          />

          <label>Quantity</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })}
            min="1"
            required
          />

          <button type="submit">Add Resource</button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : resources.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
          No resources available
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resources.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '0.75rem',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(31, 41, 55, 0.4)',
              }}
            >
              <div>
                <strong style={{ textTransform: 'capitalize', color: '#e5e7eb' }}>{r.name || r.type}</strong>
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Type: {r.type.replace('_', ' ')} • Qty: {r.available_quantity}/{r.quantity} • Status: {r.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}