import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Header from './components/Header';
import Auth from './components/Auth';
import MapView from './components/MapView';
import IncidentForm from './components/IncidentForm';
import AlertsPanel from './components/AlertsPanel';
import Dashboard from './components/Dashboard';
import Toast from './components/Toast';
import EarlyWarningPanel from './components/EarlyWarningPanel';
import PreparednessChecklist from './components/PreparednessChecklist';
import ResourceManagement from './components/ResourceManagement';
import VolunteerRegistration from './components/VolunteerRegistration';
import DamageAssessment from './components/DamageAssessment';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import OfflineIndicator from './components/OfflineIndicator';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('during'); // 'before', 'during', 'after', 'analytics'
  const socketRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sahayata_auth');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.token && parsed.user) {
            setAuth(parsed);
          } else {
            // Invalid auth data, clear it
            localStorage.removeItem('sahayata_auth');
            setAuth(null);
          }
        } catch (parseErr) {
          // Invalid JSON, clear it
          console.error('Error parsing stored auth:', parseErr);
          localStorage.removeItem('sahayata_auth');
          setAuth(null);
        }
      }
    } catch (err) {
      console.error('Error loading auth:', err);
      setAuth(null);
    }
  }, []);

  const showToast = React.useCallback((message, type = 'info') => {
    console.log('🍞 Showing toast:', message, type);
    setToast({ message, type });
  }, []);

  // Global Socket.IO connection for real-time notifications
  useEffect(() => {
    console.log('🔌 Connecting to Socket.IO server at:', API_BASE);
    const socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    // Listen for broadcast alerts globally
    socket.on('broadcast-alert', (alert) => {
      console.log('📢 Global alert received via Socket.IO:', alert);
      const alertMessage = alert.message || alert.title || 'New alert';
      showToast(`🚨 ${alertMessage}`, 'warning');
    });

    // Test connection
    socket.on('connect', () => {
      console.log('🧪 Testing Socket.IO - connection established');
    });

    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showToast]);

  const handleAuth = (data) => {
    setAuth(data);
    localStorage.setItem('sahayata_auth', JSON.stringify(data));
    showToast('Welcome! You have successfully logged in.', 'success');
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('sahayata_auth');
    showToast('You have been logged out.', 'info');
  };

  const user = auth?.user || null;
  const token = auth?.token || null;

  return (
    <div className="app-shell">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Header user={user} onLogout={handleLogout} />
      {!user ? (
        <Auth onAuth={handleAuth} showToast={showToast} />
      ) : (
        <>
          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            padding: '1rem', 
            borderBottom: '2px solid rgba(55, 65, 81, 0.5)',
            background: 'rgba(17, 24, 39, 0.8)',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(55, 65, 81, 0.5)'
          }}>
            <button
              onClick={() => setActiveTab('before')}
              className={activeTab === 'before' ? '' : 'secondary'}
              style={{ fontWeight: activeTab === 'before' ? 'bold' : 'normal' }}
            >
              🛡️ BEFORE (Preparedness)
            </button>
            <button
              onClick={() => setActiveTab('during')}
              className={activeTab === 'during' ? '' : 'secondary'}
              style={{ fontWeight: activeTab === 'during' ? 'bold' : 'normal' }}
            >
              🚨 DURING (Response)
            </button>
            <button
              onClick={() => setActiveTab('after')}
              className={activeTab === 'after' ? '' : 'secondary'}
              style={{ fontWeight: activeTab === 'after' ? 'bold' : 'normal' }}
            >
              🔄 AFTER (Recovery)
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={activeTab === 'analytics' ? '' : 'secondary'}
              style={{ fontWeight: activeTab === 'analytics' ? 'bold' : 'normal' }}
            >
              📊 Analytics
            </button>
          </div>

          {/* BEFORE Tab - Preparedness & Prevention */}
          {activeTab === 'before' && (
            <div style={{ padding: '1rem' }}>
              <div className="layout">
                <div>
                  <MapView />
                </div>
                <div>
                  <EarlyWarningPanel />
                  <PreparednessChecklist />
                  {user?.role === 'admin' && (
                    <ResourceManagement token={token} user={user} />
                  )}
                  <VolunteerRegistration token={token} showToast={showToast} />
                </div>
              </div>
            </div>
          )}

          {/* DURING Tab - Response */}
          {activeTab === 'during' && (
            <div style={{ padding: '1rem' }}>
              <div className="layout">
                <div>
                  <MapView />
                </div>
                <div>
                  <IncidentForm token={token} showToast={showToast} />
                  <AlertsPanel user={user} token={token} showToast={showToast} />
                  {user?.role === 'admin' && (
                    <ResourceManagement token={token} user={user} />
                  )}
                </div>
              </div>
              <Dashboard />
            </div>
          )}

          {/* AFTER Tab - Recovery & Rehabilitation */}
          {activeTab === 'after' && (
            <div style={{ padding: '1rem' }}>
              <div className="layout">
                <div>
                  <MapView />
                </div>
                <div>
                  <DamageAssessment token={token} showToast={showToast} />
                  <Dashboard />
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div style={{ padding: '1rem' }}>
              <AnalyticsDashboard user={user} />
            </div>
          )}
          <OfflineIndicator token={token} />
        </>
      )}
    </div>
  );
}