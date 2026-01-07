import mongoose from 'mongoose';

const reliefDistributionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['food', 'water', 'medical', 'clothing', 'shelter', 'other'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: 'packets',
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  distributed_to: [{
    beneficiary_id: String, // Aadhaar or phone
    beneficiary_name: String,
    quantity: Number,
    verified: {
      type: Boolean,
      default: false,
    },
    verified_at: Date,
  }],
  distributed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  status: {
    type: String,
    enum: ['planned', 'in_transit', 'distributing', 'completed'],
    default: 'planned',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  completed_at: Date,
});

reliefDistributionSchema.index({ location: '2dsphere' });
reliefDistributionSchema.index({ status: 1, created_at: -1 });

export default mongoose.model('ReliefDistribution', reliefDistributionSchema);