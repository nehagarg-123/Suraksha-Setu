import { calculateDistance } from './incidentClustering.js';

export function findSafestRoute(start, end, hazards = [], blockedRoads = []) {
  // Simplified A* pathfinding algorithm
  // In production, use a proper routing service like OSRM or Google Directions API
  
  const waypoints = [start];
  
  // Simple heuristic: avoid known hazards and blocked roads
  // For a real implementation, integrate with a routing API
  const directDistance = calculateDistance(
    start.latitude,
    start.longitude,
    end.latitude,
    end.longitude
  );

  // Check if direct route is safe
  const directRouteHazards = hazards.filter(h => {
    const distToHazard = calculateDistance(
      start.latitude,
      start.longitude,
      h.latitude || h.coordinates?.[0]?.latitude || 0,
      h.longitude || h.coordinates?.[0]?.longitude || 0
    );
    return distToHazard < 5; // Within 5km
  });

  if (directRouteHazards.length === 0 && blockedRoads.length === 0) {
    waypoints.push(end);
    return {
      waypoints,
      distance: directDistance,
      estimated_time: directDistance * 2, // Rough estimate: 2 min per km
      warnings: [],
    };
  }

  // If hazards exist, suggest alternative route
  // This is a simplified version - in production, use proper routing
  const warnings = directRouteHazards.map(h => ({
    type: h.type,
    message: `Avoid ${h.type} zone`,
  }));

  return {
    waypoints: [start, end], // Simplified - would calculate actual waypoints
    distance: directDistance * 1.2, // 20% longer to avoid hazards
    estimated_time: directDistance * 1.2 * 2,
    warnings,
    alternative_route: true,
  };
}

export function findNearestShelter(location, shelters) {
  if (!shelters || shelters.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const shelter of shelters) {
    if (!shelter.is_active || shelter.current_occupancy >= shelter.capacity) {
      continue;
    }

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      shelter.latitude,
      shelter.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...shelter, distance };
    }
  }

  return nearest;
}