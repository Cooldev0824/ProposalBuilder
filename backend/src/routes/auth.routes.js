const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// Base route: /api/auth

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get user profile
router.get('/profile', auth, authController.getProfile);

module.exports = router;