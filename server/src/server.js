import express from 'express';
import http from 'http';
import cors from 'cors';
import env from './config/env.js';
import { setupCallWebSocket } from './websocket/callHandler.js';

const app = express();

// Configure CORS to accept requests from our local frontend development client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Express Health Probe
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Voice AI Health Screener API'
  });
});

const server = http.createServer(app);

// Attach WebSocket Server
setupCallWebSocket(server);

// Start listening
const PORT = env.port;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Voice AI Health Screener running on port ${PORT}`);
  console.log(`👉 WebSocket Endpoint: ws://localhost:${PORT}`);
  console.log(`👉 REST API Health Check: http://localhost:${PORT}/health`);
  console.log(`======================================================\n`);
});
