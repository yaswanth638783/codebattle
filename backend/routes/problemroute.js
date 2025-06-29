const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');

router.get('/', async (req, res) => {
  try {
    const { difficulty, tag } = req.query;
    let filter = {};
    
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    
    if (tag) {
      filter.tags = { $in: [tag] };
    }
    
    // Include tags in the select to avoid undefined error
    const problems = await Problem.find(filter).select('title difficulty tags');
    res.json(problems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json(problem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;