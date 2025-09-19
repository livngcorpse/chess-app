// stockfishWorker.js
// This web worker runs Stockfish WASM for AI chess calculations

let stockfish = null;
let isReady = false;

// Import Stockfish WASM
importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');

// Initialize Stockfish when worker starts
if (typeof Stockfish !== 'undefined') {
  stockfish = new Stockfish();
  
  stockfish.onmessage = function(event) {
    const message = event.data || event;
    
    // Check if Stockfish is ready
    if (message === 'uciok') {
      isReady = true;
      self.postMessage({ type: 'ready' });
    }
    
    // Handle best move response
    if (message.startsWith('bestmove')) {
      const parts = message.split(' ');
      const bestMove = parts[1];
      
      if (bestMove && bestMove !== '(none)') {
        self.postMessage({ 
          type: 'bestmove', 
          move: bestMove 
        });
      } else {
        self.postMessage({ 
          type: 'error', 
          message: 'No valid move found' 
        });
      }
    }
    
    // Handle evaluation info
    if (message.includes('score cp')) {
      const scoreMatch = message.match(/score cp (-?\d+)/);
      if (scoreMatch) {
        const centipawns = parseInt(scoreMatch[1]);
        self.postMessage({ 
          type: 'evaluation', 
          centipawns: centipawns 
        });
      }
    }
    
    // Handle mate scores
    if (message.includes('score mate')) {
      const mateMatch = message.match(/score mate (-?\d+)/);
      if (mateMatch) {
        const mateIn = parseInt(mateMatch[1]);
        self.postMessage({ 
          type: 'mate', 
          mateIn: mateIn 
        });
      }
    }
  };
  
  // Initialize UCI protocol
  stockfish.postMessage('uci');
} else {
  // Fallback error if Stockfish fails to load
  self.postMessage({ 
    type: 'error', 
    message: 'Failed to load Stockfish engine' 
  });
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (!stockfish) {
    self.postMessage({ 
      type: 'error', 
      message: 'Stockfish engine not available' 
    });
    return;
  }
  
  switch (type) {
    case 'init':
      if (isReady) {
        self.postMessage({ type: 'ready' });
      }
      break;
      
    case 'position':
      // Set board position
      if (data.fen) {
        stockfish.postMessage(`position fen ${data.fen}`);
      } else if (data.moves) {
        stockfish.postMessage(`position startpos moves ${data.moves.join(' ')}`);
      } else {
        stockfish.postMessage('position startpos');
      }
      break;
      
    case 'go':
      // Start calculating best move
      const { depth = 10, movetime = 1000, skill = 20 } = data;
      
      // Set skill level (0-20, where 20 is strongest)
      stockfish.postMessage(`setoption name Skill Level value ${skill}`);
      
      // Set search depth and time
      if (depth && movetime) {
        stockfish.postMessage(`go depth ${depth} movetime ${movetime}`);
      } else if (depth) {
        stockfish.postMessage(`go depth ${depth}`);
      } else if (movetime) {
        stockfish.postMessage(`go movetime ${movetime}`);
      } else {
        stockfish.postMessage('go depth 10 movetime 1000');
      }
      break;
      
    case 'evaluate':
      // Get position evaluation
      if (data.fen) {
        stockfish.postMessage(`position fen ${data.fen}`);
      }
      stockfish.postMessage('eval');
      break;
      
    case 'stop':
      // Stop current calculation
      stockfish.postMessage('stop');
      break;
      
    case 'quit':
      // Quit engine
      stockfish.postMessage('quit');
      break;
      
    case 'setoption':
      // Set engine options
      const { name, value } = data;
      stockfish.postMessage(`setoption name ${name} value ${value}`);
      break;
      
    default:
      self.postMessage({ 
        type: 'error', 
        message: `Unknown command: ${type}` 
      });
  }
};

// Handle errors
self.onerror = function(error) {
  self.postMessage({ 
    type: 'error', 
    message: `Worker error: ${error.message}` 
  });
};

// Utility functions for move conversion
function uciToMove(uciMove) {
  if (!uciMove || uciMove.length < 4) return null;
  
  return {
    from: uciMove.substring(0, 2),
    to: uciMove.substring(2, 4),
    promotion: uciMove.length > 4 ? uciMove[4] : null
  };
}

// Export move conversion utility
self.uciToMove = uciToMove;