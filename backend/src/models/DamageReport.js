import mongoose from 'mongoose';

const damageReportSchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  building_condition: {
    type: String,
    enum: ['intact', 'minor_damage', 'moderate_damage', 'severe_damage', 'destroyed'],
  },
  crop_damage: {
    type: String,
    enum: ['none', 'minor', 'moderate', 'severe', 'total_loss'],
  },
  electricity_status: {
    type: String,
    enum: ['functional', 'intermittent', 'down'],
  },
  infrastructure_status: {
    roads: {
      type: String,
      enum: ['passable', 'damaged', 'blocked'],
    },
    bridges: {
      type: String,
      enum: ['functional', 'damaged', 'collapsed'],
    },
    water_supply: {
      type: String,
      enum: ['normal', 'limited', 'disrupted'],
    },
  },
  damage_images: [{
    url: String,
    ai_classification: {
      severity: {
        type: String,
        enum: ['minor', 'moderate', 'severe'],
      },
      confidence: Number,
    },
  }],
  estimated_loss: {
    type: Number,
  },
  reported_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('DamageReport', damageReportSchema);