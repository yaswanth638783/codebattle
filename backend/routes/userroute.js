const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireauth');
const Room = require('../models/Room');

router.get('/battle-history', requireAuth, async (req, res) => {
  try {
    const battles = await Room.find({
      participants: req.user.id,
      status: 'completed'
    }).sort({ endedAt: -1 });
    
    res.json(battles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;