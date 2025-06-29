const express = require('express');
const router = express.Router();
const { evaluateCode } = require('../services/judge');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission')
const {requireAuth} = require('../middleware/requireauth');

// In submissionroute.js - Update the submission route
router.post('/:problemId', requireAuth, async (req, res) => {
  try {
    const { code, language } = req.body;
    const problem = await Problem.findById(req.params.problemId);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const result = await evaluateCode(code, problem.testCases, language);
    
    // Save submission
    const submission = new Submission({
      userId: req.user.id,
      problemId: req.params.problemId,
      code,
      language,
      status: result.status,
    });
    await submission.save();

    res.json(result);
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error during submission',
      details: error.stack 
    });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const solvedCount = await Submission.countDocuments({
      userId: req.user.id,
      status: 'Solved'
    });
    res.json({ solvedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;