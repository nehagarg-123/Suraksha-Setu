import mongoose from 'mongoose';

const responderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  current_location: {
    latitude: Number,
    longitude: Number,
    updated_at: Date,
  },
  status: {
    type: String,
    enum: ['available', 'on_duty', 'off_duty', 'busy'],
    default: 'available',
  },
  vehicle_type: {
    type: String,
    enum: ['ambulance', 'boat', 'fire_truck', 'rescue_vehicle', 'other', 'none'],
  },
  vehicle_id: String,
  current_incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  tracking_enabled: {
    type: Boolean,
    default: true,
  },
  last_seen: {
    type: Date,
    default: Date.now,
  },
});

responderSchema.index({ user: 1 });
responderSchema.index({ status: 1, current_location: '2dsphere' });

export default mongoose.model('Responder', responderSchema);