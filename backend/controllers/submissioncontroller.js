const Submission = require('../models/Submission');
const Problem = require('../models/Problem');

exports.submitBattleSolution = async (req, res) => {
  try {
    const { problemId, code, language } = req.body;
    const roomId = req.params.roomId;
    
    // Verify problem exists in room
    const room = await Room.findById(roomId).populate('problems');
    if (!room.problems.some(p => p._id.equals(problemId))) {
      return res.status(400).json({ error: 'Problem not in this battle' });
    }

    // Execute code (simplified - implement your code execution logic)
    const problem = await Problem.findById(problemId);
    const results = runCodeAgainstTestCases(code, language, problem.testCases);

    // Save submission
    const submission = new Submission({
      userId: req.user.id,
      problemId,
      roomId,
      code,
      language,
      status: results.allPassed ? 'Solved' : 'Failed',
      results
    });

    await submission.save();

    // Update battle progress
    const io = req.app.get('io');
    io.to(roomId).emit('submissionUpdate', submission);

    res.json({
      status: submission.status,
      message: results.allPassed ? 'All test cases passed!' : 'Some test cases failed',
      details: results.testCases
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Submission failed' });
  }
};