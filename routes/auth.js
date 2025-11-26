const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username must be less than 30 characters',
    'any.required': 'Username is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.max': 'Password is too long',
    'any.required': 'Password is required'
  }),
  zipcode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required().messages({
    'string.pattern.base': 'Please enter a valid zip code (5 digits, e.g., 12345)',
    'any.required': 'Zip code is required'
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  });
};

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Normalize input data
    const username = req.body.username.trim();
    const email = req.body.email.toLowerCase().trim();
    const password = req.body.password;
    const zipcode = req.body.zipcode.trim();

    // Check if user already exists (case-insensitive email check)
    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ message: 'This email is already registered. Please use a different email or try logging in.' });
      }
      return res.status(409).json({ message: 'This username is already taken. Please choose a different username.' });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      zipcode,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `This ${field} is already registered. Please use a different ${field}.`
      });
    }

    res.status(500).json({ message: 'Unable to create account. Please try again later.' });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Normalize email to lowercase
    const email = req.body.email.toLowerCase().trim();
    const password = req.body.password;

    // Find user (case-insensitive email)
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Unable to log in. Please try again later.' });
  }
});

module.exports = router;
