import React, { useState, useEffect } from 'react';
import api from '../services/api';

const HomePage = ({ onStartGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState(10);
  const [loading, setLoading] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecentGames();
  }, []);

  const fetchRecentGames = async () => {
    try {
      const response = await api.get('/games?limit=5');
      if (response.data.success) {
        setRecentGames(response.data.games);
      }
    } catch (error) {
      console.error('Error fetching recent games:', error);
    }
  };

  const startAIGame = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/games', {
        gameType: 'ai',
        playerWhite: playerName || 'Anonymous',
        aiDifficulty: parseInt(aiDifficulty),
        timeControl: { initial: 600000, increment: 0 } // 10 minutes
      });

      if (response.data.success) {
        onStartGame('ai', response.data.game);
      }
    } catch (error) {
      setError('Failed to create AI game. Please try again.');
      console.error('Error creating AI game:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPvPGame = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/games', {
        gameType: 'pvp',
        playerWhite: playerName || 'Anonymous',
        timeControl: { initial: 600000, increment: 0 }
      });

      if (response.data.success) {
        onStartGame('pvp', response.data.game);
      }
    } catch (error) {
      setError('Failed to create PvP game. Please try again.');
      console.error('Error creating PvP game:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinPvPGame = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // First, check if room exists
      const gameResponse = await api.get(`/games/${roomId}?type=room`);
      
      if (gameResponse.data.success) {
        // Join the room
        const joinResponse = await api.post(`/games/room/${roomId}/join`, {
          playerName: playerName || 'Anonymous'
        });
        
        if (joinResponse.data.success) {
          onStartGame('pvp', joinResponse.data.game);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Room not found. Please check the room ID.');
      } else {
        setError('Failed to join game. Please try again.');
      }
      console.error('Error joining PvP game:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatGameTime = (timestamp) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGameStatusDisplay = (game) => {
    if (game.gameStatus === 'active') return '🟢 Active';
    if (game.gameStatus === 'checkmate') return `🏁 Checkmate - ${game.winner} wins`;
    if (game.gameStatus === 'draw') return '🤝 Draw';
    if (game.gameStatus === 'resigned') return `🏳️ ${game.winner} wins by resignation`;
    return `⏹️ ${game.gameStatus}`;
  };

  return (
    <div className="homepage">
      <div className="welcome-section">
        <h2>Welcome to Chess Web App!</h2>
        <p>Play chess against AI or challenge other players online</p>
      </div>

      {error && (
        <div className="error-message" style={{ 
          background: 'rgba(244, 67, 54, 0.2)', 
          border: '1px solid rgba(244, 67, 54, 0.5)',
          color: '#f44336',
          padding: '12px',
          borderRadius: '8px',
          margin: '16px 0'
        }}>
          {error}
        </div>
      )}

      <div className="game-modes">
        <div className="card">
          <h3>🤖 Play vs AI</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="difficulty">AI Difficulty:</label>
            <select
              id="difficulty"
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              className="select"
            >
              <option value={1}>Beginner (Level 1)</option>
              <option value={5}>Easy (Level 5)</option>
              <option value={10}>Medium (Level 10)</option>
              <option value={15}>Hard (Level 15)</option>
              <option value={20}>Expert (Level 20)</option>
            </select>
          </div>
          <button 
            onClick={startAIGame}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? <div className="loading"></div> : 'Start AI Game'}
          </button>
        </div>

        <div className="card">
          <h3>👥 Play vs Player</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="input"
            />
          </div>
          
          <div className="pvp-options">
            <div className="form-group">
              <button 
                onClick={createPvPGame}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {loading ? <div className="loading"></div> : 'Create New Game'}
              </button>
            </div>
            
            <div className="form-group">
              <input
                type="text"
                placeholder="Enter room ID to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="input"
                style={{ marginBottom: '8px' }}
              />
              <button 
                onClick={joinPvPGame}
                disabled={loading || !roomId.trim()}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                {loading ? <div className="loading"></div> : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {recentGames.length > 0 && (
        <div className="card">
          <h3>📊 Recent Games</h3>
          <div className="recent-games">
            {recentGames.map((game) => (
              <div key={game.gameId} className="recent-game-item" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                margin: '8px 0',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {game.playerWhite} vs {game.playerBlack}
                  </div>
                  <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                    {game.gameType.toUpperCase()} • {formatGameTime(game.createdAt)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9em' }}>
                    {getGameStatusDisplay(game)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="features-info card">
        <h3>🎯 Features</h3>
        <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <li>🤖 Play against Stockfish AI with adjustable difficulty</li>
          <li>👥 Real-time multiplayer using room codes</li>
          <li>♟️ Full chess rules with move validation</li>
          <li>⏱️ Built-in game timer</li>
          <li>📊 Game history and analysis</li>
          <li>📱 Responsive design for mobile and desktop</li>
        </ul>
      </div>
    </div>
  );
};

export default HomePage;