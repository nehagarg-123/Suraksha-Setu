import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function IncidentChat({ incidentId, token, user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [incidentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/incidents/${incidentId}/chat`);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post(
        `${API_BASE}/api/incidents/${incidentId}/chat`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error sending message');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '400px', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '8px', background: 'rgba(17, 24, 39, 0.8)' }}>
      <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(55, 65, 81, 0.5)', background: 'rgba(31, 41, 55, 0.6)' }}>
        <strong style={{ color: '#e5e7eb' }}>💬 Incident Chat</strong>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="loading-spinner"></span>
          </div>
        ) : messages.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center' }}>No messages yet</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: m.sender_role === 'admin' 
                  ? 'rgba(59, 130, 246, 0.2)' 
                  : m.sender_role === 'responder' 
                  ? 'rgba(34, 197, 94, 0.2)' 
                  : 'rgba(31, 41, 55, 0.6)',
                border: `1px solid ${m.sender_role === 'admin' 
                  ? 'rgba(59, 130, 246, 0.4)' 
                  : m.sender_role === 'responder' 
                  ? 'rgba(34, 197, 94, 0.4)' 
                  : 'rgba(55, 65, 81, 0.5)'}`,
                alignSelf: m.sender?.id === user?.id ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                {m.sender?.name || 'Unknown'} ({m.sender_role})
              </div>
              <div style={{ color: '#e5e7eb' }}>{m.message}</div>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                {new Date(m.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ padding: '0.75rem', borderTop: '1px solid rgba(55, 65, 81, 0.5)', display: 'flex', gap: '0.5rem', background: 'rgba(31, 41, 55, 0.4)' }}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1 }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}