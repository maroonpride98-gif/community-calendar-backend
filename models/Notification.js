const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    default: 'info',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  },
  targetUsers: {
    type: String,
    enum: ['all', 'admins', 'specific'],
    default: 'all',
  },
  specificUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    default: null, // null means no expiration
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isActive: 1 });
notificationSchema.index({ targetUsers: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
