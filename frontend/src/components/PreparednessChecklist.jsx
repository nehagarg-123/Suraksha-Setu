import React, { useState } from 'react';

const disasterTypes = ['flood', 'earthquake', 'cyclone', 'fire', 'landslide'];

const checklists = {
  flood: [
    'Keep emergency kit ready with food, water, and first aid',
    'Store important documents in waterproof containers',
    'Identify evacuation routes and safe locations',
    'Stay informed about weather forecasts',
    'Avoid walking or driving through floodwaters',
    'Turn off electricity and gas if flooding is imminent',
  ],
  earthquake: [
    'Secure heavy furniture and appliances to walls',
    'Create an emergency communication plan',
    'Practice "Drop, Cover, and Hold On"',
    'Keep emergency supplies in multiple locations',
    'Identify safe spots in each room (under sturdy furniture)',
    'Know how to turn off gas, water, and electricity',
  ],
  cyclone: [
    'Secure or bring indoors all loose objects',
    'Board up windows or use storm shutters',
    'Stock up on non-perishable food and water',
    'Charge all electronic devices',
    'Stay away from windows during the storm',
    'Listen to official weather updates',
  ],
  fire: [
    'Install smoke detectors on every floor',
    'Create and practice a fire escape plan',
    'Keep fire extinguishers accessible',
    'Never leave cooking unattended',
    'Check electrical wiring regularly',
    'Keep flammable materials away from heat sources',
  ],
  landslide: [
    'Monitor rainfall and water levels',
    'Avoid building on steep slopes',
    'Plant trees and vegetation to stabilize soil',
    'Install drainage systems',
    'Watch for warning signs (cracks, bulging ground)',
    'Have an evacuation plan ready',
  ],
};

export default function PreparednessChecklist() {
  const [selectedType, setSelectedType] = useState('flood');
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = (index) => {
    setCheckedItems({
      ...checkedItems,
      [`${selectedType}-${index}`]: !checkedItems[`${selectedType}-${index}`],
    });
  };

  return (
    <div className="card">
      <h3>📋 Disaster Preparedness Checklist</h3>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Select a disaster type and check off items as you prepare
      </p>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {disasterTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={selectedType === type ? '' : 'secondary'}
            style={{ textTransform: 'capitalize' }}
          >
            {type}
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(55, 65, 81, 0.2)', paddingTop: '1rem' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', textTransform: 'capitalize', color: '#f3f4f6' }}>
          {selectedType} Preparedness
        </h4>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {checklists[selectedType].map((item, index) => {
            const key = `${selectedType}-${index}`;
            const checked = checkedItems[key] || false;
            return (
              <li
                key={index}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: checked ? 'rgba(34, 197, 94, 0.2)' : 'rgba(31, 41, 55, 0.6)',
                  border: checked ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(55, 65, 81, 0.5)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => toggleItem(index)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(index)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ flex: 1, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1, color: '#e5e7eb' }}>
                  {item}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#e5e7eb' }}>💡 Emergency Kit Essentials</h4>
        <ul style={{ fontSize: '0.85rem', margin: 0, paddingLeft: '1.25rem', color: '#d1d5db' }}>
          <li>Water (1 gallon per person per day)</li>
          <li>Non-perishable food (3-day supply)</li>
          <li>First aid kit</li>
          <li>Flashlight and batteries</li>
          <li>Whistle to signal for help</li>
          <li>Important documents (copies)</li>
        </ul>
      </div>
    </div>
  );
}