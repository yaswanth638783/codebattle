const mongoose = require('mongoose');

const ProblemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true,
  },
  testCases: {
    type: [{
      input: {
        type: String,
        required: true
      },
      output: {
        type: String,
        required: true
      }
    }],
    required: true,
    validate: {
      validator: function(testCases) {
        return testCases.length > 0;
      },
      message: 'At least one test case is required'
    }
  },
  tags: {
    type: [String],
    required: true,
    validate: {
      validator: function(tags) {
        return tags.length > 0;
      },
      message: 'At least one tag is required'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ProblemSchema.index({ difficulty: 1 });
ProblemSchema.index({ tags: 1 });

module.exports = mongoose.model('Problem', ProblemSchema);