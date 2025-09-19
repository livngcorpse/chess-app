const express = require('express');
const router = express.Router();
const {
  createGame,
  getGame,
  updateGame,
  getRecentGames,
  joinRoom,
  deleteGame
} = require('../controllers/gameController');

// POST /api/games - Create a new game
router.post('/', createGame);

// GET /api/games - Get recent games
router.get('/', getRecentGames);

// GET /api/games/:id - Get specific game by ID or room ID
router.get('/:id', getGame);

// PUT /api/games/:id - Update game state
router.put('/:id', updateGame);

// DELETE /api/games/:id - Delete game
router.delete('/:id', deleteGame);

// POST /api/games/room/:roomId/join - Join PvP room
router.post('/room/:roomId/join', joinRoom);

module.exports = router;