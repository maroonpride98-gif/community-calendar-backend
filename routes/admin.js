const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

// GET /api/admin/users - Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count
    const totalUsers = await User.countDocuments();

    // Get users (password is automatically excluded by the toJSON method)
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        usersPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET /api/admin/active-members - Get active members (logged in recently)
router.get('/active-members', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30; // Default to last 30 days
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Get active members (users who logged in within the time period)
    const activeMembers = await User.find({
      lastLogin: { $gte: daysAgo }
    })
      .sort({ lastLogin: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const totalActive = await User.countDocuments({
      lastLogin: { $gte: daysAgo }
    });

    res.json({
      members: activeMembers,
      days: days,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActive / limit),
        totalActiveMembers: totalActive,
        membersPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching active members:', error);
    res.status(500).json({ message: 'Failed to fetch active members' });
  }
});

// GET /api/admin/events - Get all events (admin only)
router.get('/events', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Get total count
    const totalEvents = await Event.countDocuments();

    // Get events with organizer information
    const events = await Event.find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('organizer_id', 'username email')
      .select('-__v');

    res.json({
      events,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents,
        eventsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /api/admin/stats - Get system statistics (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const adminUsers = await User.countDocuments({ isAdmin: true });

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get upcoming events
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: today }
    });

    // Get events by category
    const eventsByCategory = await Event.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      totalUsers,
      totalEvents,
      adminUsers,
      recentUsers,
      upcomingEvents,
      eventsByCategory,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// DELETE /api/admin/users/:id - Delete a user (admin only)
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.userId.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user and their events
    await Event.deleteMany({ organizer_id: userId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and their events deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// DELETE /api/admin/events/:id - Delete an event (admin only)
router.delete('/events/:id', adminAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(eventId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// POST /api/admin/notifications - Create a notification (admin only)
router.post('/notifications', adminAuth, async (req, res) => {
  try {
    const { title, message, type, priority, targetUsers, expiresAt } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (title.length > 100) {
      return res.status(400).json({ message: 'Title must be 100 characters or less' });
    }

    if (message.length > 500) {
      return res.status(400).json({ message: 'Message must be 500 characters or less' });
    }

    // Create notification
    const notification = new Notification({
      title,
      message,
      type: type || 'info',
      priority: priority || 'normal',
      targetUsers: targetUsers || 'all',
      createdBy: req.userId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await notification.save();

    res.status(201).json({
      message: 'Notification created successfully',
      notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to create notification' });
  }
});

// GET /api/admin/notifications - Get all notifications (admin only)
router.get('/notifications', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalNotifications = await Notification.countDocuments();

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username email')
      .select('-__v');

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        notificationsPerPage: limit,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// DELETE /api/admin/notifications/:id - Delete a notification (admin only)
router.delete('/notifications/:id', adminAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;
