export function calculateIncidentPriority(incident) {
  let priority = 0;

  // Base priority by type (0-40 points)
  const typePriority = {
    fire: 40,
    earthquake: 35,
    flood: 30,
    landslide: 30,
    medical: 25,
    cyclone: 30,
    other: 15,
  };
  priority += typePriority[incident.type?.toLowerCase()] || 15;

  // Severity multiplier (0-30 points)
  const severityMultiplier = {
    CRITICAL: 30,
    HIGH: 20,
    MODERATE: 10,
    LOW: 5,
  };
  priority += severityMultiplier[incident.severity] || 5;

  // SOS flag (20 points)
  if (incident.sos_flag || incident.keywords?.some(k => 
    ['sos', 'trapped', 'urgent', 'help', 'emergency'].includes(k.toLowerCase())
  )) {
    priority += 20;
  }

  // Number of reports (cluster size) (0-10 points)
  if (incident.cluster_size > 1) {
    priority += Math.min(10, incident.cluster_size * 2);
  }

  // Weather severity (0-10 points)
  if (incident.risk_level === 'CRITICAL') {
    priority += 10;
  } else if (incident.risk_level === 'HIGH') {
    priority += 7;
  } else if (incident.risk_level === 'MODERATE') {
    priority += 3;
  }

  // Time since report (urgency decay) (-5 to 0 points)
  if (incident.created_at) {
    const hoursSinceReport = (Date.now() - new Date(incident.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReport > 24) {
      priority -= 5; // Very old reports get lower priority
    } else if (hoursSinceReport > 12) {
      priority -= 2;
    }
  }

  // Cap at 100
  priority = Math.min(100, Math.max(0, priority));

  return Math.round(priority);
}

export function extractKeywords(description) {
  if (!description) return [];
  
  const keywords = [];
  const lowerDesc = description.toLowerCase();
  
  const keywordMap = {
    sos: ['sos', 'help', 'emergency', 'urgent'],
    trapped: ['trapped', 'stuck', 'cannot move', 'blocked'],
    fire: ['fire', 'burning', 'smoke', 'flames'],
    flood: ['flood', 'water', 'drowning', 'submerged'],
    medical: ['injured', 'hurt', 'medical', 'ambulance', 'hospital'],
  };

  for (const [key, terms] of Object.entries(keywordMap)) {
    if (terms.some(term => lowerDesc.includes(term))) {
      keywords.push(key);
    }
  }

  return keywords;
}