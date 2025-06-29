const express = require('express');
const router = express.Router();
const { 
  createRoom,
  getAvailableRooms, 
  getRoomById,
  joinRoom, 
  leaveRoom, 
  startRoom,
  endRoom,
  submitBattleSolution
} = require('../controllers/roomcontroller');
const { requireAuth } = require('../middleware/requireauth');

router.post('/', requireAuth, createRoom);
router.get('/available', requireAuth, getAvailableRooms);
router.get('/:id', requireAuth, getRoomById);
router.post('/join', requireAuth, joinRoom);
router.post('/leave', requireAuth, leaveRoom);
router.post('/start', requireAuth, startRoom);
router.post('/:roomId/end', requireAuth, endRoom);
router.post('/:roomId/submit', requireAuth, submitBattleSolution);

module.exports = router;