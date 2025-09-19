const Game = require('../models/Game');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join a game room
    socket.on('join-room', async (data) => {
      try {
        const { roomId, playerName } = data;
        
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;

        // Notify room that player joined
        socket.to(roomId).emit('player-joined', {
          playerName,
          playersInRoom: await getPlayersInRoom(io, roomId)
        });

        // Send current game state to joining player
        socket.emit('game-state', {
          currentFen: game.currentFen,
          moves: game.moves,
          gameStatus: game.gameStatus,
          playerWhite: game.playerWhite,
          playerBlack: game.playerBlack,
          playerTimes: game.playerTimes
        });

        console.log(`👥 Player ${playerName} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle move made by player
    socket.on('make-move', async (data) => {
      try {
        const { roomId, move, currentFen, pgn, playerTimes, gameStatus, winner } = data;
        
        // Update game in database
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Update game state
        game.currentFen = currentFen;
        game.pgn = pgn;
        game.playerTimes = playerTimes;
        if (gameStatus) game.gameStatus = gameStatus;
        if (winner) game.winner = winner;
        
        await game.save();

        // Broadcast move to all players in room
        io.to(roomId).emit('move-made', {
          move,
          currentFen,
          pgn,
          playerTimes,
          gameStatus,
          winner,
          madeBy: socket.playerName
        });

        console.log(`♟️  Move made in room ${roomId}: ${move.from}-${move.to}`);
      } catch (error) {
        console.error('Error handling move:', error);
        socket.emit('error', { message: 'Failed to process move' });
      }
    });

    // Handle game resignation
    socket.on('resign', async (data) => {
      try {
        const { roomId, resigningPlayer } = data;
        
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Determine winner based on who resigned
        const winner = resigningPlayer === 'white' ? 'black' : 'white';
        
        game.gameStatus = 'resigned';
        game.winner = winner;
        await game.save();

        // Notify all players in room
        io.to(roomId).emit('game-resigned', {
          resigningPlayer,
          winner,
          gameStatus: 'resigned'
        });

        console.log(`🏳️  Player ${resigningPlayer} resigned in room ${roomId}`);
      } catch (error) {
        console.error('Error handling resignation:', error);
        socket.emit('error', { message: 'Failed to process resignation' });
      }
    });

    // Handle draw offer
    socket.on('offer-draw', async (data) => {
      try {
        const { roomId, offeredBy } = data;
        
        // Broadcast draw offer to other players
        socket.to(roomId).emit('draw-offered', {
          offeredBy
        });

        console.log(`🤝 Draw offered by ${offeredBy} in room ${roomId}`);
      } catch (error) {
        console.error('Error handling draw offer:', error);
        socket.emit('error', { message: 'Failed to offer draw' });
      }
    });

    // Handle draw response
    socket.on('draw-response', async (data) => {
      try {
        const { roomId, accepted, respondedBy } = data;
        
        if (accepted) {
          // Update game status to draw
          const game = await Game.findOne({ roomId });
          if (game) {
            game.gameStatus = 'draw';
            game.winner = 'draw';
            await game.save();
          }

          // Notify all players
          io.to(roomId).emit('draw-accepted', {
            gameStatus: 'draw',
            winner: 'draw'
          });
        } else {
          // Notify that draw was declined
          socket.to(roomId).emit('draw-declined', {
            declinedBy: respondedBy
          });
        }

        console.log(`🤝 Draw ${accepted ? 'accepted' : 'declined'} in room ${roomId}`);
      } catch (error) {
        console.error('Error handling draw response:', error);
        socket.emit('error', { message: 'Failed to process draw response' });
      }
    });

    // Handle chat messages (optional)
    socket.on('chat-message', (data) => {
      const { roomId, message, sender } = data;
      
      // Broadcast chat message to room
      io.to(roomId).emit('chat-message', {
        message,
        sender,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      
      if (socket.roomId && socket.playerName) {
        // Notify room that player left
        socket.to(socket.roomId).emit('player-left', {
          playerName: socket.playerName
        });
      }
    });

    // Handle reconnection to room
    socket.on('reconnect-room', async (data) => {
      try {
        const { roomId, playerName } = data;
        
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;

        // Send current game state
        socket.emit('game-state', {
          currentFen: game.currentFen,
          moves: game.moves,
          gameStatus: game.gameStatus,
          playerWhite: game.playerWhite,
          playerBlack: game.playerBlack,
          playerTimes: game.playerTimes,
          winner: game.winner
        });

        // Notify others of reconnection
        socket.to(roomId).emit('player-reconnected', {
          playerName
        });

        console.log(`🔄 Player ${playerName} reconnected to room ${roomId}`);
      } catch (error) {
        console.error('Error handling reconnection:', error);
        socket.emit('error', { message: 'Failed to reconnect' });
      }
    });
  });

  // Helper function to get players in room
  async function getPlayersInRoom(io, roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
  }
};

module.exports = setupSocket;