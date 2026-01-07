import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
  },
  source: {
    type: String,
    enum: ['manual', 'incident', 'hazard', 'early_warning'],
    default: 'manual',
  },
  level: {
    type: String,
    enum: ['SAFE', 'MODERATE', 'HIGH', 'CRITICAL'],
    default: 'MODERATE',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Alert', alertSchema);