import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className={`toast ${type}`} style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 10000,
      minWidth: '300px',
      maxWidth: '500px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'info' && 'ℹ'}
        {type === 'warning' && '⚠️'}
        <span>{message}</span>
      </div>
    </div>
  );
}