import React, { useState } from 'react';
import './App.css';

// Components
import HomePage from './pages/HomePage';
import ChessboardAI from './components/ChessboardAI';
import ChessboardPvP from './components/ChessboardPvP';

function App() {
  const [gameMode, setGameMode] = useState(null);
  const [gameData, setGameData] = useState(null);

  const startNewGame = (mode, data = null) => {
    setGameMode(mode);
    setGameData(data);
  };

  const returnToHome = () => {
    setGameMode(null);
    setGameData(null);
  };

  const renderGameComponent = () => {
    switch (gameMode) {
      case 'ai':
        return (
          <ChessboardAI 
            gameData={gameData} 
            onBackToHome={returnToHome}
          />
        );
      case 'pvp':
        return (
          <ChessboardPvP 
            gameData={gameData} 
            onBackToHome={returnToHome}
          />
        );
      default:
        return <HomePage onStartGame={startNewGame} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>♟️ Chess Web App</h1>
      </header>
      <main className="App-main">
        {renderGameComponent()}
      </main>
    </div>
  );
}

export default App;