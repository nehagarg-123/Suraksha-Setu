import React, { useState } from 'react';

export default function Header({ user, onLogout }) {
  const [logoError, setLogoError] = useState(false);

  // Logo path - using SVG logo
  // You can replace this with your own logo.png, .jpg, or .svg file
  // Just place it in frontend/public/ and update the path below
  const logoPath = '/logo.svg';

  return (
    <header>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img
          src={logoPath}
          alt="Suraksha Setu Logo"
          className="logo"
          onError={() => {
            // Hide logo if it fails to load (file doesn't exist)
            setLogoError(true);
          }}
          style={{ display: logoError ? 'none' : 'block' }}
        />
        <div>
          <h1> SURAKSHA SETU</h1>
          {user && (
            <p className="muted" style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Real-time incident monitoring and management
            </p>
          )}
        </div>
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="pill">
            👤 <strong>{user.name || user.email}</strong>
          </span>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}