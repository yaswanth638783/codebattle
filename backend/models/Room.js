const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    trim: true,
    maxlength: 20,
    select: false
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxParticipants: {
    type: Number,
    required: true,
    min: 2,
    max: 6,
    default: 2
  },
  problems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  }],
  timeLimit: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 120,
    default: 30
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  scoreboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    solvedProblems: {
      type: Number,
      default: 0
    },
    timeTaken: { // in seconds
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    submissions: [{
      problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem'
      },
      problemTitle: String,
      problemDifficulty: String,
      status: {
        type: String,
        enum: ['Submitted', 'Solved', 'Failed', 'Error']
      },
      submittedAt: {
        type: Date,
        default: Date.now
      },
      executionTime: Number, // in seconds
      testCasesPassed: Number,
      totalTestCases: Number
    }]
  }],
  completedParticipants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  battleOptions: {
    scoringMethod: {
      type: String,
      enum: ['time-based', 'completion-based', 'hybrid'],
      default: 'hybrid'
    },
    difficultyMultiplier: {
      easy: {
        type: Number,
        default: 1.0
      },
      medium: {
        type: Number,
        default: 1.5
      },
      hard: {
        type: Number,
        default: 2.0
      }
    },
    timePenalty: {
      type: Number,
      default: 0.1 // points lost per minute
    }
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property to check if user is creator
RoomSchema.virtual('isCreator').get(function() {
  return this.creator && this.creator._id.equals(this.userId);
});

// Virtual property for battle duration
RoomSchema.virtual('duration').get(function() {
  if (this.startedAt && this.endedAt) {
    return (this.endedAt - this.startedAt) / 1000; // in seconds
  }
  return null;
});

// Indexes for better performance
RoomSchema.index({ status: 1 });
RoomSchema.index({ creator: 1 });
RoomSchema.index({ participants: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ startedAt: -1 });
RoomSchema.index({ endedAt: -1 });

// Pre-save hook to ensure participants don't exceed maxParticipants
RoomSchema.pre('save', function(next) {
  if (this.participants.length > this.maxParticipants) {
    throw new Error('Room participants exceed maximum limit');
  }
  next();
});

// Method to add participant
RoomSchema.methods.addParticipant = function(userId) {
  if (this.participants.includes(userId)) {
    throw new Error('User already in room');
  }
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Room is full');
  }
  this.participants.push(userId);
  return this.save();
};

// Method to remove participant
RoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    participant => !participant.equals(userId)
  );
  return this.save();
};

// Method to start the battle
RoomSchema.methods.startBattle = function() {
  if (this.status !== 'waiting') {
    throw new Error('Battle can only be started from waiting state');
  }
  if (this.participants.length < 2) {
    throw new Error('Need at least 2 participants to start');
  }
  this.status = 'active';
  this.startedAt = new Date();
  return this.save();
};

// Method to end the battle
RoomSchema.methods.endBattle = function() {
  if (this.status !== 'active') {
    throw new Error('Battle can only be ended from active state');
  }
  this.status = 'completed';
  this.endedAt = new Date();
  return this.save();
};

// Static method to get available rooms
RoomSchema.statics.getAvailableRooms = function() {
  return this.find({ status: 'waiting' })
    .populate('creator', 'username')
    .populate('participants', 'username')
    .populate('problems', 'title difficulty');
};

module.exports = mongoose.model('Room', RoomSchema);