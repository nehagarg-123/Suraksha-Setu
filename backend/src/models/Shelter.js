import mongoose from 'mongoose';

const shelterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
    default: 0,
  },
  current_occupancy: {
    type: Number,
    default: 0,
  },
  has_water: {
    type: Boolean,
    default: false,
  },
  has_toilets: {
    type: Boolean,
    default: false,
  },
  has_first_aid: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    trim: true,
  },
  contact_phone: {
    type: String,
    trim: true,
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

shelterSchema.index({ latitude: 1, longitude: 1 });

export default mongoose.model('Shelter', shelterSchema);