import React, { useEffect, useState } from 'react';
import { isOnline, getOfflineQueue, syncQueue } from '../utils/offlineQueue';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function OfflineIndicator({ token }) {
  const [online, setOnline] = useState(isOnline());
  const [queueSize, setQueueSize] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setOnline(isOnline());
      setQueueSize(getOfflineQueue().filter(item => !item.synced).length);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!online || !token) return;
    
    setSyncing(true);
    try {
      const result = await syncQueue(API_BASE, token);
      alert(`Synced ${result.synced} item(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`);
      setQueueSize(getOfflineQueue().filter(item => !item.synced).length);
    } catch (err) {
      console.error('Sync error:', err);
      alert('Error syncing offline items');
    } finally {
      setSyncing(false);
    }
  };

  if (online && queueSize === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        padding: '0.75rem 1rem',
        background: online ? '#fef3c7' : '#fee2e2',
        border: `2px solid ${online ? '#fbbf24' : '#ef4444'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      {online ? (
        <>
          <span>✅ Online</span>
          {queueSize > 0 && (
            <>
              <span style={{ fontSize: '0.85rem' }}>
                {queueSize} item(s) pending sync
              </span>
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <span>⚠️ Offline</span>
          <span style={{ fontSize: '0.85rem' }}>
            {queueSize} item(s) queued
          </span>
        </>
      )}
    </div>
  );
}