
import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    trim: true,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
  },
  description: {
    type: String,
    trim: true,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  risk_score: {
    type: Number,
    default: 0,
  },
  risk_level: {
    type: String,
    default: 'SAFE',
    enum: ['SAFE', 'MODERATE', 'HIGH', 'CRITICAL'],
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  priority_calculated: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['reported', 'acknowledged', 'in_progress', 'resolved', 'closed'],
    default: 'reported',
  },
  media_attachments: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'video'],
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  }],
  reported_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  responder_team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: String,
    assigned_at: Date,
  }],
  duplicate_of: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  is_duplicate: {
    type: Boolean,
    default: false,
  },
  cluster_id: {
    type: String,
  },
  keywords: [String],
  sos_flag: {
    type: Boolean,
    default: false,
  },
  offline_synced: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  resolved_at: Date,
});

// Index for geospatial queries
incidentSchema.index({ latitude: 1, longitude: 1 });
incidentSchema.index({ status: 1, priority: -1 });
incidentSchema.index({ cluster_id: 1 });
incidentSchema.index({ created_at: -1 });

export default mongoose.model('Incident', incidentSchema);
