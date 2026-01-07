import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skills: [{
    type: String,
    enum: ['medical', 'rescue', 'communication', 'logistics', 'technical', 'counseling', 'other'],
  }],
  certifications: [{
    type: String,
    trim: true,
  }],
  availability_status: {
    type: String,
    enum: ['available', 'busy', 'unavailable'],
    default: 'available',
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
  phone_verified: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approved_at: Date,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Volunteer', volunteerSchema);