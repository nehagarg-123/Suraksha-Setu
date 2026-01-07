import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  response_time_rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  satisfaction_rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comments: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

feedbackSchema.index({ incident: 1 });
feedbackSchema.index({ created_at: -1 });

export default mongoose.model('Feedback', feedbackSchema);
