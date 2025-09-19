// api.js - Frontend API service for communicating with backend
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens (future use)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('chess_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.request);
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
const gameAPI = {
  // Create a new game
  createGame: async (gameData) => {
    const response = await api.post('/games', gameData);
    return response.data;
  },

  // Get game by ID or room ID
  getGame: async (id, type = 'game') => {
    const response = await api.get(`/games/${id}?type=${type}`);
    return response.data;
  },

  // Update game state
  updateGame: async (gameId, updateData) => {
    const response = await api.put(`/games/${gameId}`, updateData);
    return response.data;
  },

  // Get recent games
  getRecentGames: async (limit = 10, gameType = null) => {
    const params = { limit };
    if (gameType) params.gameType = gameType;
    
    const response = await api.get('/games', { params });
    return response.data;
  },

  // Join PvP room
  joinRoom: async (roomId, playerName) => {
    const response = await api.post(`/games/room/${roomId}/join`, { playerName });
    return response.data;
  },

  // Delete game
  deleteGame: async (gameId) => {
    const response = await api.delete(`/games/${gameId}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Utility functions
const apiUtils = {
  // Handle API errors gracefully
  handleError: (error, defaultMessage = 'An error occurred') => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    } else if (error.message) {
      return error.message;
    }
    return defaultMessage;
  },

  // Check if server is reachable
  isServerReachable: async () => {
    try {
      await gameAPI.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  },

  // Retry failed requests
  retryRequest: async (requestFn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

// Export both the axios instance and API methods
export default api;
export { gameAPI, apiUtils };