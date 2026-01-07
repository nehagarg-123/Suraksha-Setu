import fetch from 'node-fetch';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

export async function getWeatherData(lat, lon) {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not set, using mock data');
    return getMockWeatherData();
  }

  try {
    const url = `${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return getMockWeatherData();
    }

    const data = await response.json();
    return {
      temperature: data.main?.temp || 0,
      humidity: data.main?.humidity || 0,
      pressure: data.main?.pressure || 0,
      wind_speed: data.wind?.speed ? data.wind.speed * 3.6 : 0, // Convert m/s to km/h
      wind_direction: data.wind?.deg || 0,
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0,
      description: data.weather?.[0]?.description || '',
    };
  } catch (error) {
    console.error('Weather service error:', error);
    return getMockWeatherData();
  }
}

export async function getForecastData(lat, lon) {
  if (!OPENWEATHER_API_KEY) {
    return getMockForecastData();
  }

  try {
    const url = `${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return getMockForecastData();
    }

    const data = await response.json();
    return data.list?.slice(0, 5) || [];
  } catch (error) {
    console.error('Forecast service error:', error);
    return getMockForecastData();
  }
}

function getMockWeatherData() {
  return {
    temperature: 28,
    humidity: 65,
    pressure: 1013,
    wind_speed: 15,
    wind_direction: 180,
    rainfall: 0,
    description: 'clear sky',
  };
}

function getMockForecastData() {
  return [
    { dt: Date.now() / 1000 + 3600, main: { temp: 28 }, rain: { '3h': 0 } },
    { dt: Date.now() / 1000 + 7200, main: { temp: 27 }, rain: { '3h': 5 } },
  ];
}