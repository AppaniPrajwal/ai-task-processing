const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  inputText: {
    type: String,
    required: true,
  },
  operation: {
    type: String,
    enum: ['uppercase', 'lowercase', 'reverse string', 'word count'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed'],
    default: 'pending',
  },
  result: {
    type: String,
    default: null,
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info'
    },
    message: String
  }],
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
