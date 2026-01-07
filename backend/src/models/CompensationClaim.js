import mongoose from 'mongoose';

const compensationClaimSchema = new mongoose.Schema({
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  damage_report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DamageReport',
  },
  claim_type: {
    type: String,
    enum: ['property', 'crop', 'livestock', 'medical', 'other'],
    required: true,
  },
  amount_requested: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  supporting_documents: [{
    url: String,
    type: String,
  }],
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'disbursed'],
    default: 'submitted',
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewed_at: Date,
  approved_amount: Number,
  rejection_reason: String,
  disbursed_at: Date,
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('CompensationClaim', compensationClaimSchema);