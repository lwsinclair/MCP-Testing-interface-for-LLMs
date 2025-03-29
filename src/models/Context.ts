import mongoose from 'mongoose';

const contextSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  prompts: [{
    type: String,
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
contextSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Context = mongoose.model('Context', contextSchema); 