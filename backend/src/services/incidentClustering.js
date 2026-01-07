// Simple clustering algorithm to group nearby incidents
export function clusterIncidents(incidents, radiusKm = 2) {
  const clusters = [];
  const processed = new Set();

  for (let i = 0; i < incidents.length; i++) {
    if (processed.has(i)) continue;

    const cluster = [incidents[i]];
    processed.add(i);

    for (let j = i + 1; j < incidents.length; j++) {
      if (processed.has(j)) continue;

      const distance = calculateDistance(
        incidents[i].latitude,
        incidents[i].longitude,
        incidents[j].latitude,
        incidents[j].longitude
      );

      if (distance <= radiusKm) {
        cluster.push(incidents[j]);
        processed.add(j);
      }
    }

    if (cluster.length > 1) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

export function generateClusterId() {
  return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}