from flask import Flask, request, jsonify
import requests

app = Flask(__name__)


def _clamp(value, min_value, max_value):
    return max(min_value, min(max_value, value))


def compute_risk(data):
    """Simple heuristic flood-risk score (0 - 100)."""
    try:
        rain_mm = float(data.get('rain_mm', 0) or 0)
        river_level_m = float(data.get('river_level_m', 0) or 0)
        soil_moisture_pct = float(data.get('soil_moisture_pct', 0) or 0)
        history_pct = float(data.get('history_pct', 0) or 0)
        wind_kmh = float(data.get('wind_kmh', 0) or 0)
    except (TypeError, ValueError):
        rain_mm = river_level_m = soil_moisture_pct = history_pct = wind_kmh = 0.0

    # Get user-selected severity and convert to numeric weight
    severity = (data.get('severity') or '').upper()
    severity_weights = {
        'CRITICAL': 90.0,
        'HIGH': 75.0,
        'MODERATE': 55.0,
        'LOW': 30.0,
    }
    severity_component = severity_weights.get(severity, 0.0)

    rain_component = _clamp(rain_mm / 200.0 * 100.0, 0.0, 100.0)
    river_component = _clamp(river_level_m / 10.0 * 100.0, 0.0, 100.0)
    soil_component = _clamp(100.0 - soil_moisture_pct, 0.0, 100.0)
    history_component = _clamp(history_pct, 0.0, 100.0)
    wind_component = _clamp(wind_kmh / 100.0 * 100.0, 0.0, 100.0)

    # User-selected severity has highest weight (40%), then environmental factors
    score = (
        0.40 * severity_component
        + 0.25 * rain_component
        + 0.15 * river_component
        + 0.10 * soil_component
        + 0.05 * history_component
        + 0.05 * wind_component
    )

    # Ensure the score never falls below the chosen severity band
    score = max(score, severity_component)

    return round(_clamp(score, 0.0, 100.0), 1)


def fetch_weather(lat, lon):
    """Fetch basic weather metrics from Open-Meteo."""
    if lat is None or lon is None:
        return {}

    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current_weather": True,
                "hourly": "rain,soil_moisture_0_1cm,wind_speed_10m",
                "forecast_days": 1,
            },
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:
        return {}

    current = data.get("current_weather", {}) or {}
    hourly = data.get("hourly", {}) or {}

    rain_series = hourly.get("rain") or []
    soil_series = hourly.get("soil_moisture_0_1cm") or []
    times = hourly.get("time") or []

    # Find the index corresponding to the current weather time, fallback to latest.
    idx = None
    current_time = current.get("time")
    if current_time and current_time in times:
        idx = times.index(current_time)
    elif times:
        idx = len(times) - 1

    rain_mm = float(rain_series[idx]) if idx is not None and idx < len(rain_series) else 0.0
    soil_moisture_pct = (
        _clamp(float(soil_series[idx]) * 100.0, 0.0, 100.0)
        if idx is not None and idx < len(soil_series)
        else 0.0
    )

    return {
        "rain_mm": rain_mm,
        "wind_kmh": float(current.get("windspeed") or 0.0),
        "soil_moisture_pct": soil_moisture_pct,
        # The model can still accept user-supplied river/history values.
    }


@app.route('/predict', methods=['POST'])
def predict():
    payload = request.get_json(force=True, silent=True) or {}

    # Try to enrich with live weather if a location is provided.
    lat = payload.get('lat') or payload.get('latitude')
    lon = payload.get('lon') or payload.get('longitude')
    try:
        lat = float(lat) if lat is not None else None
        lon = float(lon) if lon is not None else None
    except (TypeError, ValueError):
        lat = lon = None

    enriched = {**payload, **fetch_weather(lat, lon)}

    score = compute_risk(enriched)

    # If user provided severity, respect it for level. Otherwise derive from score.
    user_severity = (payload.get('severity') or '').upper()
    if user_severity in ('CRITICAL', 'HIGH', 'MODERATE', 'LOW'):
        level = user_severity
    else:
        if score > 75:
            level = 'CRITICAL'
        elif score > 50:
            level = 'HIGH'
        elif score > 30:
            level = 'MODERATE'
        else:
            level = 'SAFE'

    return jsonify({
        'risk_score': score,
        'level': level,
        'input': payload,
    })


@app.route('/')
def home():
    return 'ML Service Running'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)