import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['boat', 'ambulance', 'rescue_team', 'medical_kit', 'food_packet', 'water', 'other'],
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  available_quantity: {
    type: Number,
    default: function() {
      return this.quantity;
    },
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  status: {
    type: String,
    enum: ['available', 'deployed', 'maintenance', 'reserved'],
    default: 'available',
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Resource', resourceSchema);