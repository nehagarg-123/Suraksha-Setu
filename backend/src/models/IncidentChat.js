import mongoose from 'mongoose';

const incidentChatSchema = new mongoose.Schema({
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender_role: {
    type: String,
    enum: ['citizen', 'responder', 'admin'],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  attachments: [{
    url: String,
    type: String,
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

incidentChatSchema.index({ incident: 1, created_at: -1 });

export default mongoose.model('IncidentChat', incidentChatSchema);