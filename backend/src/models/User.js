import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin', 'responder'],
  },
  reset_token_hash: {
    type: String,
  },
  reset_token_expires_at: {
    type: Date,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Remove password_hash from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

export default mongoose.model('User', userSchema);