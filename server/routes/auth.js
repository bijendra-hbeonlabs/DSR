const express = require('express');
const { login, register, logout, forgotPassword } = require('../controllers/authController');

const router = express.Router();

// Authentication routes
router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

module.exports = router;
