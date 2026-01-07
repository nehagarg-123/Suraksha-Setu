import { getWeatherData, getForecastData } from './weatherService.js';

export async function calculateRiskScore(location, incidentType = null) {
  const { latitude, longitude } = location;
  
  // Get current weather
  const weather = await getWeatherData(latitude, longitude);
  const forecast = await getForecastData(latitude, longitude);

  let riskScore = 0;
  const factors = {};

  // Rainfall intensity (0-2 points)
  const rainfall24h = weather.rainfall || 0;
  if (rainfall24h > 100) {
    factors.rainfall = 2;
  } else if (rainfall24h > 50) {
    factors.rainfall = 1.5;
  } else if (rainfall24h > 20) {
    factors.rainfall = 1;
  } else {
    factors.rainfall = 0;
  }
  riskScore += factors.rainfall;

  // Wind speed (for cyclones) (0-1.5 points)
  if (weather.wind_speed > 120) {
    factors.wind = 1.5;
  } else if (weather.wind_speed > 60) {
    factors.wind = 1;
  } else if (weather.wind_speed > 30) {
    factors.wind = 0.5;
  } else {
    factors.wind = 0;
  }
  riskScore += factors.wind;

  // Temperature (for heatwaves) (0-1 point)
  if (weather.temperature > 45) {
    factors.temperature = 1;
  } else if (weather.temperature > 40) {
    factors.temperature = 0.5;
  } else {
    factors.temperature = 0;
  }
  riskScore += factors.temperature;

  // Humidity (for drought) (0-0.5 points)
  if (weather.humidity < 20) {
    factors.humidity = 0.5;
  } else {
    factors.humidity = 0;
  }
  riskScore += factors.humidity;

  // Forecast analysis (0-1 point)
  const heavyRainInForecast = forecast.some(f => (f.rain?.['3h'] || 0) > 50);
  if (heavyRainInForecast) {
    factors.forecast = 1;
  } else {
    factors.forecast = 0;
  }
  riskScore += factors.forecast;

  // Cap at 5
  riskScore = Math.min(5, Math.max(0, riskScore));

  // Determine risk level
  let riskLevel = 'SAFE';
  if (riskScore >= 4) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 3) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 1.5) {
    riskLevel = 'MODERATE';
  }

  return {
    risk_score: Math.round(riskScore * 10) / 10,
    risk_level: riskLevel,
    factors,
    weather_data: weather,
  };
}

export function detectHazardType(weather, location) {
  const hazards = [];

  // Flood detection
  if (weather.rainfall > 50 || (weather.rainfall > 20 && weather.humidity > 80)) {
    hazards.push({
      type: 'flood',
      confidence: weather.rainfall > 100 ? 0.9 : 0.6,
    });
  }

  // Cyclone detection
  if (weather.wind_speed > 60) {
    hazards.push({
      type: 'cyclone',
      confidence: weather.wind_speed > 120 ? 0.95 : 0.7,
    });
  }

  // Heatwave detection
  if (weather.temperature > 40 && weather.humidity < 30) {
    hazards.push({
      type: 'heatwave',
      confidence: weather.temperature > 45 ? 0.9 : 0.6,
    });
  }

  // Drought detection
  if (weather.humidity < 20 && weather.rainfall < 5) {
    hazards.push({
      type: 'drought',
      confidence: 0.7,
    });
  }

  return hazards;
}