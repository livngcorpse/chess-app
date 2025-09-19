const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  gameType: {
    type: String,
    enum: ['ai', 'pvp', 'local'],
    required: true
  },
  playerWhite: {
    type: String,
    default: 'Anonymous'
  },
  playerBlack: {
    type: String,
    default: 'Stockfish AI'
  },
  currentFen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  moves: [{
    moveNumber: Number,
    white: String,
    black: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  pgn: {
    type: String,
    default: ''
  },
  gameStatus: {
    type: String,
    enum: ['active', 'checkmate', 'stalemate', 'draw', 'resigned', 'timeout'],
    default: 'active'
  },
  winner: {
    type: String,
    enum: ['white', 'black', 'draw'],
    default: null
  },
  aiDifficulty: {
    type: Number,
    min: 1,
    max: 20,
    default: 10
  },
  timeControl: {
    initial: {
      type: Number,
      default: 600000 // 10 minutes in ms
    },
    increment: {
      type: Number,
      default: 0
    }
  },
  playerTimes: {
    white: {
      type: Number,
      default: 600000
    },
    black: {
      type: Number,
      default: 600000
    }
  },
  roomId: {
    type: String,
    sparse: true // Only for PvP games
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  spectators: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
gameSchema.index({ gameType: 1, createdAt: -1 });
gameSchema.index({ roomId: 1 }, { sparse: true });
gameSchema.index({ gameStatus: 1 });

// Virtual for game duration
gameSchema.virtual('duration').get(function() {
  return this.updatedAt - this.createdAt;
});

// Static method to generate unique game ID
gameSchema.statics.generateGameId = function() {
  return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Static method to generate room ID for PvP
gameSchema.statics.generateRoomId = function() {
  return 'room_' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Method to add a move
gameSchema.methods.addMove = function(moveNumber, whiteMove, blackMove = null) {
  const existingMoveIndex = this.moves.findIndex(move => move.moveNumber === moveNumber);
  
  if (existingMoveIndex !== -1) {
    // Update existing move
    if (whiteMove) this.moves[existingMoveIndex].white = whiteMove;
    if (blackMove) this.moves[existingMoveIndex].black = blackMove;
  } else {
    // Add new move
    this.moves.push({
      moveNumber,
      white: whiteMove,
      black: blackMove
    });
  }
  
  return this.save();
};

// Method to check if game is finished
gameSchema.methods.isFinished = function() {
  return ['checkmate', 'stalemate', 'draw', 'resigned', 'timeout'].includes(this.gameStatus);
};

module.exports = mongoose.model('Game', gameSchema);