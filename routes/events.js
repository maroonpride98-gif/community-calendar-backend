const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Event = require('../models/Event');
const { auth, optionalAuth } = require('../middleware/auth');

// Validation schema
const eventSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(2000).allow(''),
  category: Joi.string()
    .valid('general', 'garage_sale', 'sports', 'church', 'town_meeting', 'community', 'fundraiser', 'workshop', 'festival')
    .required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  time: Joi.string().allow(''),
  location: Joi.string().max(200).required(),
  contact_info: Joi.string().max(100).allow(''),
  image_url: Joi.string().uri().allow(''),
  max_capacity: Joi.number().min(0).default(0),
  tags: Joi.array().items(Joi.string()).max(10).default([]),
});

// GET /api/events - Get all events (with optional filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;

    // Build query
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Get events
    const events = await Event.find(query).sort({ date: 1, created_at: -1 });

    // Transform events with user-specific data
    const eventsWithUserData = events.map(event =>
      event.toClientJSON(req.userId)
    );

    res.json(eventsWithUserData);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /api/events/:id - Get single event
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event.toClientJSON(req.userId));
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
});

// POST /api/events - Create new event (requires auth)
router.post('/', auth, async (req, res) => {
  try {
    // Validate input
    const { error } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Create event
    const event = new Event({
      ...req.body,
      organizer: req.user.username,
      organizer_id: req.userId,
    });

    await event.save();

    res.status(201).json(event.toClientJSON(req.userId));
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// PUT /api/events/:id - Update event (requires auth)
router.put('/:id', auth, async (req, res) => {
  try {
    // Validate input
    const { error } = eventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Find event
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is organizer
    if (event.organizer_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    // Update event
    Object.assign(event, req.body);
    event.updated_at = new Date();

    await event.save();

    res.json(event.toClientJSON(req.userId));
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete event (requires auth)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find event
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is organizer
    if (event.organizer_id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }

    // Delete event
    await Event.findByIdAndDelete(req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// POST /api/events/:id/rsvp - Update RSVP status (requires auth)
router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const { rsvp_status } = req.body;

    if (!['going', 'interested', 'not_going', ''].includes(rsvp_status)) {
      return res.status(400).json({ message: 'Invalid RSVP status' });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Find existing RSVP
    const existingRsvpIndex = event.rsvps.findIndex(
      r => r.user_id.toString() === req.userId.toString()
    );

    // Update attendee counts
    if (existingRsvpIndex !== -1) {
      const oldStatus = event.rsvps[existingRsvpIndex].status;
      if (oldStatus === 'going') event.attendees_going--;
      if (oldStatus === 'interested') event.attendees_interested--;
      event.rsvps.splice(existingRsvpIndex, 1);
    }

    // Add new RSVP
    if (rsvp_status && rsvp_status !== 'not_going') {
      event.rsvps.push({
        user_id: req.userId,
        status: rsvp_status,
      });

      if (rsvp_status === 'going') event.attendees_going++;
      if (rsvp_status === 'interested') event.attendees_interested++;
    }

    await event.save();

    res.json({
      event_id: event._id,
      rsvp_status,
    });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ message: 'Failed to update RSVP' });
  }
});

// POST /api/events/:id/favorite - Toggle favorite (requires auth)
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const { is_favorited } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already favorited
    const favIndex = event.favorites.findIndex(
      f => f.toString() === req.userId.toString()
    );

    if (is_favorited && favIndex === -1) {
      // Add to favorites
      event.favorites.push(req.userId);
    } else if (!is_favorited && favIndex !== -1) {
      // Remove from favorites
      event.favorites.splice(favIndex, 1);
    }

    await event.save();

    res.json({
      event_id: event._id,
      is_favorited,
    });
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ message: 'Failed to update favorite' });
  }
});

module.exports = router;
