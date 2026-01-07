import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Create custom icons for different risk levels
function createCustomIcon(riskLevel) {
  const level = (riskLevel || '').toUpperCase();
  let color = '#22c55e'; // safe - green
  if (level === 'CRITICAL') color = '#ef4444'; // red
  else if (level === 'HIGH') color = '#f97316'; // orange
  else if (level === 'MODERATE') color = '#eab308'; // yellow

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

function levelClass(level) {
  const key = (level || '').toUpperCase();
  if (key === 'CRITICAL') return 'badge critical';
  if (key === 'HIGH') return 'badge high';
  if (key === 'MODERATE') return 'badge moderate';
  return 'badge safe';
}

export default function MapView() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/incidents`)
      .then((r) => r.json())
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading incidents', err);
        setLoading(false);
      });

    const socket = io(API_BASE);
    socket.on('new-incident', (incident) => {
      setIncidents((prev) => [incident, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const center = [20.5937, 78.9629]; // India center-ish
  const incidentsWithLocation = incidents.filter(
    (i) => i.latitude != null && i.longitude != null
  );

  return (
    <div className="map-wrapper card">
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(55, 65, 81, 0.5)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>🗺️ Incident Map</h3>
        <p className="muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
          {loading
            ? 'Loading incidents...'
            : `${incidentsWithLocation.length} incident${incidentsWithLocation.length !== 1 ? 's' : ''} on map`}
        </p>
      </div>
      <div style={{ height: 'calc(100% - 60px)' }}>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {incidentsWithLocation.map((i) => (
            <Marker
              key={i.id}
              position={[i.latitude, i.longitude]}
              icon={createCustomIcon(i.risk_level)}
            >
              <Popup>
                <div
                  style={{
                    fontSize: '0.875rem',
                    minWidth: '200px',
                    padding: '0.25rem',
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem' }}>{i.type || 'Incident'}</strong>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span className={levelClass(i.risk_level)}>
                      {i.risk_level || 'SAFE'}
                    </span>
                    {typeof i.risk_score === 'number' && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          color: '#6b7280',
                          fontSize: '0.8rem',
                        }}
                      >
                        Score: {i.risk_score}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '0.5rem', color: '#9ca3af' }}>
                    {i.description}
                  </div>
                  {i.severity && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Severity: {i.severity}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}