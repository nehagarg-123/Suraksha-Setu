import mongoose from 'mongoose';

const earlyWarningSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['flood', 'cyclone', 'landslide', 'heatwave', 'drought', 'earthquake'],
  },
  severity: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
    required: true,
  },
  location: {
    latitude: Number,
    longitude: Number,
    area_name: String,
  },
  risk_score: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  predicted_impact: {
    type: String,
    trim: true,
  },
  weather_data: {
    rainfall_mm: Number,
    wind_speed_kmh: Number,
    temperature_c: Number,
    humidity_pct: Number,
    river_level_m: Number,
  },
  predicted_time: Date,
  status: {
    type: String,
    enum: ['active', 'expired', 'resolved'],
    default: 'active',
  },
  triggered_at: {
    type: Date,
    default: Date.now,
  },
  resolved_at: Date,
});

earlyWarningSchema.index({ type: 1, status: 1, triggered_at: -1 });
earlyWarningSchema.index({ location: '2dsphere' });

export default mongoose.model('EarlyWarning', earlyWarningSchema);