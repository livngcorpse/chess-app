const Game = require('../models/Game');

// Create a new game
const createGame = async (req, res) => {
  try {
    const { gameType, playerWhite, playerBlack, aiDifficulty, timeControl } = req.body;

    const gameData = {
      gameId: Game.generateGameId(),
      gameType,
      playerWhite: playerWhite || 'Anonymous',
      playerBlack: gameType === 'ai' ? 'Stockfish AI' : (playerBlack || 'Anonymous'),
      aiDifficulty: gameType === 'ai' ? (aiDifficulty || 10) : undefined,
      timeControl: timeControl || { initial: 600000, increment: 0 }
    };

    // Generate room ID for PvP games
    if (gameType === 'pvp') {
      gameData.roomId = Game.generateRoomId();
    }

    const game = new Game(gameData);
    await game.save();

    res.status(201).json({
      success: true,
      game: {
        gameId: game.gameId,
        gameType: game.gameType,
        roomId: game.roomId,
        currentFen: game.currentFen,
        playerWhite: game.playerWhite,
        playerBlack: game.playerBlack,
        gameStatus: game.gameStatus,
        aiDifficulty: game.aiDifficulty,
        timeControl: game.timeControl
      }
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game',
      error: error.message
    });
  }
};

// Get game by ID or room ID
const getGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'game' or 'room'

    let game;
    if (type === 'room') {
      game = await Game.findOne({ roomId: id });
    } else {
      game = await Game.findOne({ gameId: id });
    }

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game',
      error: error.message
    });
  }
};

// Update game state
const updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentFen, pgn, gameStatus, winner, moves, playerTimes } = req.body;

    const game = await Game.findOne({ gameId: id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Update game fields
    if (currentFen) game.currentFen = currentFen;
    if (pgn) game.pgn = pgn;
    if (gameStatus) game.gameStatus = gameStatus;
    if (winner) game.winner = winner;
    if (moves) game.moves = moves;
    if (playerTimes) game.playerTimes = playerTimes;

    await game.save();

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update game',
      error: error.message
    });
  }
};

// Get recent games
const getRecentGames = async (req, res) => {
  try {
    const { limit = 10, gameType } = req.query;
    
    const filter = {};
    if (gameType) filter.gameType = gameType;

    const games = await Game.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('gameId gameType playerWhite playerBlack gameStatus winner createdAt updatedAt');

    res.json({
      success: true,
      games
    });
  } catch (error) {
    console.error('Error fetching recent games:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch games',
      error: error.message
    });
  }
};

// Join PvP game by room ID
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerName } = req.body;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (game.gameStatus !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    // Assign player to available color
    if (game.playerBlack === 'Anonymous' || !game.playerBlack) {
      game.playerBlack = playerName || 'Anonymous';
      await game.save();
    }

    res.json({
      success: true,
      game,
      assignedColor: game.playerBlack === playerName ? 'black' : 'white'
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: error.message
    });
  }
};

// Delete game (optional - for cleanup)
const deleteGame = async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findOneAndDelete({ gameId: id });
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete game',
      error: error.message
    });
  }
};

module.exports = {
  createGame,
  getGame,
  updateGame,
  getRecentGames,
  joinRoom,
  deleteGame
};