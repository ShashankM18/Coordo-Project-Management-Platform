import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { disableRedis, getRedisClient } from './config/redis.js';
import { initSocketServer } from './sockets/index.js';

// Route imports (will be filled in Phase 2+)
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import fileRoutes from './routes/file.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import aiRoutes from './routes/ai.routes.js';
import wikiRoutes from './routes/wiki.routes.js';
import sprintRoutes from './routes/sprint.routes.js';
import meetingRoutes from './routes/meeting.routes.js';

import { errorHandler, notFound } from './middleware/error.middleware.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// --- Security & Parsing Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// --- Socket.io Setup ---
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocketServer(io);

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

import chatRoutes from './routes/chat.routes.js';

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/meetings', meetingRoutes);

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// Health check route (for Electron wait-on)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// --- Error Handlers ---
app.use(notFound);
app.use(errorHandler);

// Add this near the bottom of server.js, before error handlers
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve React build in production (Electron app)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// --- Start Server ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Connect Redis (non-blocking — app works without it in dev)
  const redis = getRedisClient();
  if (redis) {
    redis.connect().catch((err) => {
      console.warn('⚠️  Redis unavailable, continuing without cache:', err.message);
      disableRedis();
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io listening on same port`);
    console.log(`🌱 Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();

export { io };
