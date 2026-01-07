import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function levelClass(level) {
  const key = (level || '').toUpperCase();
  if (key === 'CRITICAL') return 'badge critical';
  if (key === 'HIGH') return 'badge high';
  if (key === 'MODERATE') return 'badge moderate';
  return 'badge safe';
}

function formatTime(dateString) {
  if (!dateString) return 'Unknown time';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default function AlertsPanel({ user, token, showToast }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    level: 'MODERATE',
    title: '',
    channels: ['email', 'sms', 'in_app'],
  });

  useEffect(() => {
    // Fetch alerts from API
    fetch(`${API_BASE}/api/alerts`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading alerts', err);
        setLoading(false);
      });

    // Connect to Socket.IO for real-time updates
    const socket = io(API_BASE);
    
    socket.on('broadcast-alert', (alert) => {
      console.log('📢 New alert received:', alert);
      setAlerts((prev) => [alert, ...prev]);
      // Show toast notification
      if (showToast) {
        showToast(`🚨 New Alert: ${alert.message || alert.title || 'Alert'}`, 'warning');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [showToast]);

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      showToast?.('Please enter a message', 'error');
      return;
    }

    if (!token) {
      showToast?.('Authentication required', 'error');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/alerts/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: formData.message,
          level: formData.level,
          title: formData.title || undefined,
          channels: formData.channels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send alert');
      }

      // Show detailed success message with notification results
      let successMsg = '✅ Alert sent successfully!';
      if (data.notifications) {
        const notif = data.notifications;
        const parts = [];
        if (notif.email?.sent) {
          parts.push(`📧 Email: ${notif.email.count || 0} sent`);
        } else if (notif.email) {
          parts.push(`📧 Email: ${notif.email.reason || notif.email.error || 'Failed'}`);
        }
        if (notif.sms?.sent) {
          parts.push(`📱 SMS: sent`);
        } else if (notif.sms) {
          parts.push(`📱 SMS: ${notif.sms.reason || 'Not configured'}`);
        }
        if (parts.length > 0) {
          successMsg += '\n' + parts.join(', ');
        }
      }
      showToast?.(successMsg, 'success');
      setFormData({ message: '', level: 'MODERATE', title: '', channels: ['email', 'sms', 'in_app'] });
      setShowForm(false);
      
      // Add to alerts list immediately
      if (data.id) {
        setAlerts((prev) => [data, ...prev]);
      }
      
      // Log notification results for debugging
      if (data.notifications) {
        console.log('📧 Notification results:', data.notifications);
      }
    } catch (err) {
      console.error('Error sending alert:', err);
      showToast?.(err.message || 'Failed to send alert', 'error');
    } finally {
      setSending(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const [status, setStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const checkStatus = async () => {
    if (!token) return;
    setCheckingStatus(true);
    try {
      const response = await fetch(`${API_BASE}/api/alerts/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStatus(data);
      console.log('📊 Notification status:', data);
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="card">
      <div className="top-row">
        <h3>⚠️ System Alerts</h3>
        <span className="muted" style={{ fontSize: '0.75rem' }}>Live updates</span>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={checkStatus}
              className="secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={checkingStatus}
              title="Check notification service status"
            >
              {checkingStatus ? '⏳' : '🔍 Status'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            >
              {showForm ? '✖️ Cancel' : '➕ Send Alert'}
            </button>
          </div>
        )}
      </div>

      {isAdmin && status && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(31, 41, 55, 0.4)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
          <strong>📊 Notification Status:</strong>
          <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.25rem' }}>
            <div>📧 Email: {status.email?.enabled ? '✅ Enabled' : '❌ Disabled'} ({status.users?.withEmail || 0} users)</div>
            <div>📱 SMS: {status.sms?.enabled ? '✅ Enabled' : '❌ Disabled'} ({status.users?.withPhone || 0} users)</div>
            {!status.email?.enabled && (
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                ⚠️ Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && showForm && (
        <form onSubmit={handleSendAlert} style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(31, 41, 55, 0.4)', borderRadius: '0.5rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Title (optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Alert title"
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter alert message..."
              required
              rows={3}
              style={{ width: '100%', padding: '0.5rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Alert Level
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Notification Channels
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['email', 'sms', 'in_app'].map((channel) => (
                <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, channels: [...formData.channels, channel] });
                      } else {
                        setFormData({ ...formData, channels: formData.channels.filter(c => c !== channel) });
                      }
                    }}
                  />
                  {channel === 'in_app' ? 'In-App' : channel.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={sending} className={sending ? 'secondary' : ''}>
            {sending ? 'Sending...' : '📧 Send Alert'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>No alerts yet</div>
      ) : (
        <ul className="incident-list">
          {alerts.map((a, idx) => (
            <li key={a.id || a._id || idx} style={{ animationDelay: `${idx * 0.1}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className={levelClass(a.level)}>{a.level || 'MODERATE'}</span>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                  {formatTime(a.created_at)}
                </span>
              </div>
              <span style={{ opacity: 0.9, fontSize: '0.875rem' }}>{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}