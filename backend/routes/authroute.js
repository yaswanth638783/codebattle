const express = require('express');
const router = express.Router();
const cors = require('cors');
const { test, registerUser, loginUser, getProfile } = require('../controllers/authcontroller');
const { requireAuth } = require('../middleware/requireauth'); // Add this line

router.get('/', test);
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.get('/profile', requireAuth, getProfile); // Fixed route handler

module.exports = router;