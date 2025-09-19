import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import api from '../services/api';

const ChessboardAI = ({ gameData, onBackToHome }) => {
  const [chess] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState(chess.fen());
  const [gameStatus, setGameStatus] = useState('active');
  const [winner, setWinner] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [worker, setWorker] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [playerTimes, setPlayerTimes] = useState({
    white: 600000, // 10 minutes
    black: 600000
  });
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [isGameActive, setIsGameActive] = useState(true);

  // Initialize Stockfish worker
  useEffect(() => {
    const stockfishWorker = new Worker('/stockfishWorker.js');
    
    stockfishWorker.onmessage = (e) => {
      const { type, move, error } = e.data;
      
      if (type === 'ready') {
        console.log('Stockfish AI ready');
      } else if (type === 'bestmove' && move) {
        makeAIMove(move);
      } else if (type === 'error') {
        console.error('Stockfish error:', error);
        setThinking(false);
      }
    };
    
    stockfishWorker.postMessage({ type: 'init' });
    setWorker(stockfishWorker);
    
    return () => {
      if (stockfishWorker) {
        stockfishWorker.postMessage({ type: 'quit' });
        stockfishWorker.terminate();
      }
    };
  }, []);

  // Set up initial game state
  useEffect(() => {
    if (gameData) {
      if (gameData.currentFen !== chess.fen()) {
        chess.load(gameData.currentFen);
        setGamePosition(chess.fen());
      }
      setPlayerColor(gameData.playerWhite === 'Anonymous' ? 'white' : 'black');
      setPlayerTimes(gameData.playerTimes || { white: 600000, black: 600000 });
      setGameStatus(gameData.gameStatus);
      setWinner(gameData.winner);
      setIsGameActive(gameData.gameStatus === 'active');
    }
  }, [gameData, chess]);

  // Handle AI move after player moves
  useEffect(() => {
    if (!isPlayerTurn && gameStatus === 'active' && worker && !thinking) {
      requestAIMove();
    }
  }, [isPlayerTurn, gameStatus, worker, thinking]);

  const requestAIMove = useCallback(() => {
    if (worker && !thinking && gameStatus === 'active') {
      setThinking(true);
      
      // Calculate difficulty-based parameters
      const difficulty = gameData?.aiDifficulty || 10;
      const skillLevel = Math.max(1, Math.min(20, difficulty));
      const moveTime = Math.max(100, Math.min(5000, difficulty * 200));
      
      worker.postMessage({
        type: 'position',
        data: { fen: chess.fen() }
      });
      
      worker.postMessage({
        type: 'go',
        data: {
          skill: skillLevel,
          depth: Math.max(1, Math.min(15, Math.floor(difficulty * 0.8))),
          movetime: moveTime
        }
      });
    }
  }, [worker, thinking, gameStatus, chess, gameData]);

  const makeAIMove = useCallback((uciMove) => {
    try {
      // Convert UCI move to chess.js format
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
      
      const move = chess.move({
        from: from,
        to: to,
        promotion: promotion
      });

      if (move) {
        setGamePosition(chess.fen());
        setLastMove({ from, to });
        setIsPlayerTurn(true);
        setThinking(false);
        
        // Add move to history
        setGameHistory(prev => [...prev, move]);
        
        // Check game status
        checkGameEnd();
        
        // Update game in database
        updateGameInDatabase();
      } else {
        console.error('Invalid AI move:', uciMove);
        setThinking(false);
      }
    } catch (error) {
      console.error('Error making AI move:', error);
      setThinking(false);
    }
  }, [chess]);

  const onDrop = (sourceSquare, targetSquare, piece) => {
    // Check if it's player's turn and game is active
    if (!isPlayerTurn || gameStatus !== 'active' || thinking) {
      return false;
    }

    // Check if it's the right color's turn
    const turn = chess.turn();
    const pieceColor = piece[0].toLowerCase();
    if ((turn === 'w' && pieceColor !== 'w') || (turn === 'b' && pieceColor !== 'b')) {
      return false;
    }

    // Check if player is playing the correct color
    if ((playerColor === 'white' && turn !== 'w') || (playerColor === 'black' && turn !== 'b')) {
      return false;
    }

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (move) {
        setGamePosition(chess.fen());
        setLastMove({ from: sourceSquare, to: targetSquare });
        setIsPlayerTurn(false);
        
        // Add move to history
        setGameHistory(prev => [...prev, move]);
        
        // Check game status
        checkGameEnd();
        
        // Update game in database
        updateGameInDatabase();
        
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    
    return false;
  };

  const checkGameEnd = useCallback(() => {
    if (chess.isGameOver()) {
      setIsGameActive(false);
      
      if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'black' : 'white';
        setGameStatus('checkmate');
        setWinner(winner);
      } else if (chess.isStalemate()) {
        setGameStatus('stalemate');
        setWinner('draw');
      } else if (chess.isDraw()) {
        setGameStatus('draw');
        setWinner('draw');
      }
    }
  }, [chess]);

  const updateGameInDatabase = async () => {
    try {
      await api.put(`/games/${gameData.gameId}`, {
        currentFen: chess.fen(),
        pgn: chess.pgn(),
        gameStatus: gameStatus,
        winner: winner,
        moves: gameHistory,
        playerTimes: playerTimes
      });
    } catch (error) {
      console.error('Failed to update game:', error);
    }
  };

  const handleResign = async () => {
    const confirmResign = window.confirm('Are you sure you want to resign?');
    if (confirmResign) {
      const aiWinner = playerColor === 'white' ? 'black' : 'white';
      setGameStatus('resigned');
      setWinner(aiWinner);
      setIsGameActive(false);
      
      try {
        await api.put(`/games/${gameData.gameId}`, {
          currentFen: chess.fen(),
          pgn: chess.pgn(),
          gameStatus: 'resigned',
          winner: aiWinner,
          playerTimes: playerTimes
        });
      } catch (error) {
        console.error('Failed to update resignation:', error);
      }
    }
  };

  const handleOfferDraw = () => {
    // In AI games, we can implement a simple draw by repetition or 50-move rule
    if (chess.isDraw()) {
      setGameStatus('draw');
      setWinner('draw');
      setIsGameActive(false);
      updateGameInDatabase();
    } else {
      alert('Draw not available in current position');
    }
  };

  const getStatusMessage = () => {
    if (gameStatus === 'checkmate') {
      return `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`;
    } else if (gameStatus === 'stalemate') {
      return 'Game ended in stalemate!';
    } else if (gameStatus === 'draw') {
      return 'Game ended in a draw!';
    } else if (gameStatus === 'resigned') {
      return `Game ended by resignation. ${winner === 'white' ? 'White' : 'Black'} wins!`;
    } else if (thinking) {
      return 'AI is thinking...';
    } else if (isPlayerTurn) {
      return `Your turn (${playerColor})`;
    } else {
      return 'AI is moving...';
    }
  };

  const boardOrientation = playerColor === 'black' ? 'black' : 'white';

  return (
    <div className="chessboard-container">
      <div className="game-info card">
        <h3>🤖 Playing vs AI (Level {gameData?.aiDifficulty || 10})</h3>
        
        <div className={`game-status ${isGameActive ? 'status-active' : 'status-finished'}`}>
          {getStatusMessage()}
        </div>

        <div className="players-info">
          <div className="player-info">
            <strong>You:</strong> {gameData?.playerWhite || 'Anonymous'} ({playerColor})
          </div>
          <div className="player-info">
            <strong>AI:</strong> {gameData?.playerBlack || 'Stockfish AI'}
          </div>
        </div>
      </div>

      <div className="chess-game">
        <div className="chessboard-wrapper">
          <Chessboard
            position={gamePosition}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            animationDuration={200}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customDropSquareStyle={{
              boxShadow: 'inset 0 0 1px 6px rgba(255,255,255,0.75)'
            }}
            promotionToSquare={null}
            showBoardNotation={true}
            arePremovesAllowed={false}
            boardWidth={Math.min(500, window.innerWidth - 40)}
          />
        </div>

        <div className="move-history card">
          <h4>Move History</h4>
          <div className="moves-list" style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}>
            {gameHistory.length === 0 ? (
              <p>No moves yet</p>
            ) : (
              gameHistory.map((move, index) => (
                <div key={index} style={{ 
                  display: 'inline-block', 
                  margin: '2px 8px',
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px'
                }}>
                  {Math.floor(index / 2) + 1}.
                  {index % 2 === 0 ? ' ' : '.. '}
                  {move.san}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="game-controls">
        <button onClick={onBackToHome} className="btn btn-secondary">
          ← Back to Home
        </button>
        
        {isGameActive && (
          <>
            <button 
              onClick={handleOfferDraw} 
              className="btn btn-secondary"
              disabled={thinking}
            >
              Offer Draw
            </button>
            <button 
              onClick={handleResign} 
              className="btn btn-danger"
              disabled={thinking}
            >
              Resign
            </button>
          </>
        )}
        
        {!isGameActive && (
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            New Game
          </button>
        )}
      </div>

      {thinking && (
        <div className="ai-thinking" style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000
        }}>
          <div className="loading"></div>
          <span>AI is thinking...</span>
        </div>
      )}
    </div>
  );
};

export default ChessboardAI;