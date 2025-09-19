# 🏰 Simple MERN Chess Web App (AI & PvP)

A **simple chess web application** built using the **MERN stack** that supports both **Player vs AI** and **Player vs Player (PvP)** modes.

* **AI Mode:** Play against Stockfish AI running in the browser using Web Workers.
* **PvP Mode:** Real-time multiplayer using Socket.IO.
* **Game Validation:** All moves validated with `chess.js`.
* **MongoDB Backend:** Optional saving of game states (PGN/FEN).
* **React Frontend:** Chessboard UI using `react-chessboard`.

---

## 🔹 Features

### Player vs AI

* Adjust AI difficulty via **search depth / skill level**.
* Moves calculated asynchronously in a **Web Worker**.
* Legal moves validated using `chess.js`.

### Player vs Player (PvP)

* Real-time online play with **Socket.IO**.
* Players join rooms via a **unique room ID**.
* Game state synchronized between players.
* Optional local hotseat mode (2 players on the same device).

### Game State

* Moves stored as **PGN or algebraic notation**.
* Optional persistence in **MongoDB**.
* Unique game IDs for saving and fetching games.

---

## 🔹 Tech Stack

**Frontend:**

* React
* react-chessboard / chessground
* chess.js
* Web Workers (Stockfish WASM)
* Axios

**Backend:**

* Node.js + Express
* Socket.IO
* MongoDB (Mongoose)

**AI:**

* Stockfish WASM

---

## 🔹 Installation & Setup

### Backend

1. Navigate to `backend/` folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```
MONGO_URI=mongodb://localhost:27017/simplechess
PORT=5000
```

4. Start server:

```bash
node server.js
```

Server will run at `http://localhost:5000`.

---

### Frontend

1. Navigate to `frontend/` folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start React app:

```bash
npm start
```

Frontend will run at `http://localhost:3000`.

---

## 🔹 How to Play

1. Open the web app in the browser.
2. Select a mode:

   * **Play vs AI:** Start a game against Stockfish AI.
   * **Play vs Player:** Enter a room ID to join or create a PvP game.
3. Drag and drop pieces to play moves.
4. In AI mode, the engine responds automatically.
5. In PvP mode, moves are synchronized with the opponent in real-time.

---

## 🔹 Future Enhancements

* Timer support (blitz, rapid, bullet).
* Elo rating system and leaderboards.
* Game analysis with blunder/mistake detection.
* Offline mode using PWA + IndexedDB.
* Authentication (Firebase or custom).

---

## 🔹 Dependencies

**Frontend:**

* `react`
* `react-chessboard`
* `chess.js`
* `axios`
* `socket.io-client`

**Backend:**

* `express`
* `mongoose`
* `socket.io`
* `cors`
* `dotenv`

---

## 🔹 License

This project is **open-source** and can be modified for learning or personal use.

---