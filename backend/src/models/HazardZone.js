import mongoose from 'mongoose';

const hazardZoneSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['flood_zone', 'cyclone_corridor', 'seismic_zone', 'landslide_prone', 'road_blockage_prone', 'dam_reservoir'],
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  coordinates: [{
    latitude: Number,
    longitude: Number,
  }],
  risk_level: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
    default: 'MODERATE',
  },
  description: {
    type: String,
    trim: true,
  },
  metadata: {
    // For dam/reservoir: water_level, capacity, etc.
    // For flood zones: historical_data, etc.
    type: mongoose.Schema.Types.Mixed,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

hazardZoneSchema.index({ type: 1, is_active: 1 });

export default mongoose.model('HazardZone', hazardZoneSchema);