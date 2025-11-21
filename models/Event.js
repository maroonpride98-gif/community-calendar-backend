const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['general', 'garage_sale', 'sports', 'church', 'town_meeting', 'community', 'fundraiser', 'workshop', 'festival'],
    default: 'general',
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
  },
  time: {
    type: String,
    default: '',
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
  },
  organizer: {
    type: String,
    required: true,
  },
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contact_info: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact info cannot exceed 100 characters'],
  },
  image_url: {
    type: String,
    default: '',
  },
  attendees_going: {
    type: Number,
    default: 0,
    min: 0,
  },
  attendees_interested: {
    type: Number,
    default: 0,
    min: 0,
  },
  max_capacity: {
    type: Number,
    default: 0,
    min: 0,
  },
  tags: {
    type: [String],
    default: [],
    validate: [arrayLimit, 'Cannot have more than 10 tags'],
  },
  // User-specific fields (populated per request)
  rsvps: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['going', 'interested', 'not_going'],
    },
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

function arrayLimit(val) {
  return val.length <= 10;
}

// Update timestamp on save
eventSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Add user-specific fields to response
eventSchema.methods.toClientJSON = function (userId) {
  const event = this.toObject();

  // Find user's RSVP status
  const userRsvp = this.rsvps.find(r => r.user_id.toString() === userId?.toString());
  event.user_rsvp = userRsvp ? userRsvp.status : '';

  // Check if user favorited
  event.is_favorited = this.favorites.some(f => f.toString() === userId?.toString());

  // Remove arrays (not needed in client response)
  delete event.rsvps;
  delete event.favorites;

  return event;
};

module.exports = mongoose.model('Event', eventSchema);
