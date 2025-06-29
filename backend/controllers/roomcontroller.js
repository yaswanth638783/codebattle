const Room = require('../models/Room');
const User = require('../models/user');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { evaluateCode } = require('../services/judge');

async function endBattle(room, io) {
  // Get all submissions for this battle
  const submissions = await Submission.find({ battleId: room._id })
    .populate('userId', 'username _id')
    .populate('problemId', 'title difficulty _id');

  // Calculate final scores
  const scoreboard = calculateScoreboard(room.participants, submissions, room.startedAt);

  // Update room status
  room.status = 'completed';
  room.endedAt = new Date();
  room.scoreboard = scoreboard;
  await room.save();

  // Update user stats
  await updateUserStats(room.participants, scoreboard);

  // Notify all clients
  io.to(room._id).emit('battleCompleted', {
    roomId: room._id,
    scoreboard,
    finalResults: true
  });

  // Update global room list
  io.emit('roomUpdated', {
    roomId: room._id,
    status: 'completed'
  });
}

async function updateUserStats(participants, scoreboard) {
  for (const participant of participants) {
    const user = await User.findById(participant._id);
    const userResult = scoreboard.find(entry => entry.user._id.equals(participant._id));
    
    user.stats.totalBattles += 1;
    if (scoreboard[0].user._id.equals(participant._id)) {
      user.stats.totalWins += 1;
    }
    
    const totalScore = (user.stats.averageScore || 0) * (user.stats.totalBattles - 1) + (userResult?.score || 0);
    user.stats.averageScore = totalScore / user.stats.totalBattles;
    
    await user.save();
  }
}

const calculateScoreboard = (participants, submissions, startedAt) => {
  const userStats = {};
  
  participants.forEach(participant => {
    userStats[participant._id] = {
      user: participant,
      username: participant.username,
      solvedProblems: 0,
      timeTaken: 0,
      score: 0,
      submissions: []
    };
  });

  submissions.forEach(submission => {
    const userStat = userStats[submission.userId._id];
    if (!userStat) return;

    userStat.submissions.push({
      problemId: submission.problemId,
      problemTitle: submission.problemId.title,
      problemDifficulty: submission.problemId.difficulty,
      status: submission.status,
      submittedAt: submission.submittedAt,
      executionTime: submission.executionTime,
      testCasesPassed: submission.results.filter(r => r.passed).length,
      totalTestCases: submission.results.length
    });

    if (submission.status === 'Solved') {
      userStat.solvedProblems++;
      
      const submissionTime = new Date(submission.submittedAt);
      const battleStartTime = new Date(startedAt);
      const timeTaken = Math.floor((submissionTime - battleStartTime) / 1000);
      
      userStat.timeTaken += timeTaken;
      
      // Score calculation based on difficulty and time taken
      const problemScore = submission.problemId.difficulty === 'Easy' ? 10 :
                         submission.problemId.difficulty === 'Medium' ? 20 : 30;
      userStat.score += Math.max(1, problemScore - Math.floor(timeTaken / 60));
    }
  });

  // Sort by: 1. Solved problems (desc), 2. Time taken (asc), 3. Score (desc)
  return Object.values(userStats).sort((a, b) => {
    if (b.solvedProblems !== a.solvedProblems) return b.solvedProblems - a.solvedProblems;
    if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
    return b.score - a.score;
  });
};

async function checkAllParticipantsCompleted(roomId, participants, problems) {
  const participantIds = participants.map(p => p._id);
  
  for (const participantId of participantIds) {
    const solvedCount = await Submission.countDocuments({
      battleId: roomId,
      userId: participantId,
      status: 'Solved'
    });
    if (solvedCount < problems.length) return false;
  }
  return true;
}


exports.submitBattleSolution = async (req, res) => {
  const { roomId } = req.params;
  const { problemId, code, language } = req.body;
  const userId = req.user.id;
  const io = req.app.get('io');

  try {
    // 1. Get room with all necessary data
    const room = await Room.findById(roomId)
      .populate('creator', 'username _id')
      .populate('participants', 'username _id')
      .populate('problems', 'title difficulty testCases');

    if (!room || room.status !== 'active') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Battle is not active' 
      });
    }

    // 2. Check if user has already completed all problems
    const userCompleted = room.completedParticipants?.some(p => p.equals(userId));
    if (userCompleted) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already completed all problems'
      });
    }

    // 3. Find the specific problem
    const problem = room.problems.find(p => p._id.equals(problemId));
    if (!problem) {
      return res.status(404).json({
        status: 'error',
        message: 'Problem not found in this battle'
      });
    }

    // 4. Check if user already solved this problem
    const existingSubmission = await Submission.findOne({
      battleId: roomId,
      userId,
      problemId,
      status: 'Solved'
    });

    if (existingSubmission) {
      return res.status(400).json({
        status: 'error',
        message: 'You already solved this problem'
      });
    }

    // 5. Execute code using Judge0
    const evaluation = await evaluateCode(
      code,
      problem.testCases,
      language
    );

    // 6. Save submission
    const submission = new Submission({
      battleId: roomId,
      userId,
      problemId,
      code,
      language,
      status: evaluation.status,
      results: evaluation.details,
      executionTime: evaluation.details.reduce((sum, t) => sum + (t.time || 0), 0),
      isBattleSubmission: true
    });
    await submission.save();

    // 7. If solved, check if user completed all problems
    if (evaluation.status === 'Solved') {
      const solvedCount = await Submission.countDocuments({
        battleId: roomId,
        userId,
        status: 'Solved'
      });

      // If user solved all problems, mark them as completed
      if (solvedCount >= room.problems.length) {
        if (!room.completedParticipants) {
          room.completedParticipants = [];
        }
        
        // Only add if not already completed
        if (!room.completedParticipants.some(p => p.equals(userId))) {
          room.completedParticipants.push(userId);
          await room.save();

          // Calculate temporary scoreboard for the completed user
          const submissions = await Submission.find({ battleId: room._id, userId })
            .populate('userId', 'username _id')
            .populate('problemId', 'title difficulty _id');

          const tempScoreboard = calculateScoreboard([req.user], submissions, room.startedAt);

          io.to(roomId).emit('userCompletedBattle', {
            userId,
            username: req.user.username,
            solvedCount,
            completionTime: new Date(),
            score: tempScoreboard[0].score
          });

          // Check if all participants have completed
          const allCompleted = room.participants.every(participant => 
            room.completedParticipants.some(p => p.equals(participant._id))
          );

          if (allCompleted) {
            // End battle if all participants completed
            await endBattle(room, io);
          } else {
            // Update scoreboard for remaining participants
            const allSubmissions = await Submission.find({ battleId: room._id })
              .populate('userId', 'username _id')
              .populate('problemId', 'title difficulty _id');

            const updatedScoreboard = calculateScoreboard(
              room.participants,
              allSubmissions,
              room.startedAt
            );

            io.to(roomId).emit('scoreboardUpdate', updatedScoreboard);
          }
        }
      }
    }

    // 8. Broadcast submission result
    io.to(roomId).emit('submissionUpdate', {
      userId,
      problemId,
      problemTitle: problem.title,
      ...evaluation
    });

    // 9. Return response
    res.json({
      status: evaluation.status,
      message: evaluation.message,
      details: evaluation.details,
      problemId: problem._id,
      executionTime: submission.executionTime
    });

  } catch (error) {
    console.error('Battle submission error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process battle submission',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.endRoom = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId)
      .populate('creator', 'username _id')
      .populate('participants', 'username _id')
      .populate('problems', 'title difficulty testCases');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'active') {
      return res.status(400).json({ error: 'Room is not active' });
    }

    await endBattle(room, io);
    res.json({ message: 'Battle ended successfully' });

  } catch (error) {
    console.error('Error ending room:', error);
    res.status(500).json({ error: 'Server error while ending room' });
  }
};

exports.startRoom = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { roomId } = req.body;
    
    const room = await Room.findById(roomId)
      .populate('creator', 'username _id')
      .populate('participants', 'username _id')
      .populate('problems', 'title difficulty description testCases _id');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.creator._id.equals(req.user.id)) {
      return res.status(403).json({ error: 'Only room creator can start the room' });
    }

    if (room.participants.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 participants to start' });
    }

    room.status = 'active';
    room.startedAt = new Date();
    await room.save();

    // Emit to all clients in the room and update the global room list
    io.to(roomId).emit('battleStarted', {
      roomId: room._id,
      status: 'active',
      startedAt: room.startedAt,
      timeLimit: room.timeLimit,
      problems: room.problems,
      participants: room.participants
    });

    // Update the room list for everyone
    io.emit('roomUpdated', {
      roomId: room._id,
      status: 'active'
    });

    res.json({ 
      message: 'Room started successfully',
      room: {
        _id: room._id,
        status: room.status,
        startedAt: room.startedAt,
        problems: room.problems,
        participants: room.participants
      }
    });
  } catch (error) {
    console.error('Error starting room:', error);
    res.status(500).json({ error: 'Server error while starting room' });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { name, password, maxParticipants, timeLimit, selectedProblems } = req.body;

    const problems = await Problem.find({ _id: { $in: selectedProblems } });
    if (problems.length !== selectedProblems.length) {
      return res.status(400).json({ error: 'One or more problems not found' });
    }

    const room = new Room({
      name,
      password,
      creator: req.user.id,
      participants: [req.user.id],
      maxParticipants,
      timeLimit,
      problems: selectedProblems,
      status: 'waiting'
    });

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('creator', 'username')
      .populate('participants', 'username')
      .populate('problems', 'title difficulty description testCases');

    io.emit('roomCreated', populatedRoom);
    res.status(201).json({ room: populatedRoom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAvailableRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'waiting' })
      .populate('creator', 'username')
      .populate('participants', 'username')
      .populate('problems', 'title difficulty');
    
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { roomId, password } = req.body;

    const room = await Room.findById(roomId).select('+password');
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Room is not in waiting state' });
    }

    if (room.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    if (room.participants.some(p => p.equals(req.user.id))) {
      return res.status(400).json({ error: 'Already in this room' });
    }

    room.participants.push(req.user.id);
    await room.save();

    const updatedRoom = await Room.findById(roomId)
      .populate('creator', 'username')
      .populate('participants', 'username')
      .populate('problems', 'title difficulty description testCases');

    io.to(roomId).emit('roomUpdated', updatedRoom);
    io.emit('roomUpdated', updatedRoom);

    res.json({ room: updatedRoom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username')
      .populate('participants', 'username')
      .populate('problems', 'title difficulty description testCases');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const roomObj = room.toObject();
    roomObj.isCreator = room.creator._id.equals(req.user.id);

    res.json(roomObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { roomId } = req.body;
    const room = await Room.findById(roomId)
      .populate('creator', 'username')
      .populate('participants', 'username');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    let deleted = false;

    if (room.creator._id.equals(req.user.id)) {
      await Room.deleteOne({ _id: roomId });
      deleted = true;
      io.to(roomId).emit('roomDeleted');
      io.emit('roomDeleted', roomId);
    } else {
      room.participants = room.participants.filter(
        participant => !participant._id.equals(req.user.id)
      );
      await room.save();

      const updatedRoom = await Room.findById(roomId)
        .populate('creator', 'username')
        .populate('participants', 'username')
        .populate('problems', 'title difficulty description testCases');

      io.to(roomId).emit('roomUpdated', updatedRoom);
      io.emit('roomUpdated', updatedRoom);
    }

    res.json({ message: 'Left room successfully', deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

