const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Store active rooms and their socket connections
const activeRooms = new Map();

// Helper function to generate room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Authentication middleware
function requireAuth(req, res, next) {
  console.log('Auth check:', {
    hasSession: !!req.session,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    username: req.session?.username
  });
  
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword
      }
    });

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      message: 'Registration successful', 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ 
      message: 'Login successful', 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Room routes
app.post('/api/rooms', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const roomCode = generateRoomCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        code: roomCode,
        expiresAt,
        creatorId: req.session.userId
      },
      include: {
        creator: {
          select: { username: true }
        }
      }
    });

    // Initialize room in memory
    activeRooms.set(room.id, {
      id: room.id,
      code: room.code,
      name: room.name,
      expiresAt: room.expiresAt,
      participants: new Set()
    });

    res.json({
      message: 'Room created successfully',
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        expiresAt: room.expiresAt,
        creator: room.creator.username
      }
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        creator: {
          select: { username: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isExpired || new Date() > room.expiresAt) {
      return res.status(410).json({ error: 'Room has expired' });
    }

    res.json({
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        expiresAt: room.expiresAt,
        creator: room.creator.username
      }
    });
  } catch (error) {
    console.error('Room fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/:code/messages', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        messages: {
          include: {
            user: {
              select: { username: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isExpired || new Date() > room.expiresAt) {
      return res.status(410).json({ error: 'Room has expired' });
    }

    res.json({
      messages: room.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        username: msg.user.username,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO handling
// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.use((socket, next) => {
  const session = socket.request.session;
  console.log('Socket authentication check:', {
    hasSession: !!session,
    sessionId: session?.id,
    userId: session?.userId,
    username: session?.username
  });
  
  if (session && session.userId) {
    socket.userId = session.userId;
    socket.username = session.username;
    next();
  } else {
    console.log('Socket authentication failed:', session);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.username} connected`);

  socket.on('join-room', async (roomCode) => {
    try {
      const room = await prisma.room.findUnique({
        where: { code: roomCode }
      });

      if (!room || room.isExpired || new Date() > room.expiresAt) {
        socket.emit('error', 'Room not found or has expired');
        return;
      }

      socket.join(roomCode);
      
      // Add to active room participants
      if (activeRooms.has(room.id)) {
        activeRooms.get(room.id).participants.add(socket.userId);
      }

      socket.roomCode = roomCode;
      socket.roomId = room.id;

      // Notify room that user joined
      socket.to(roomCode).emit('user-joined', {
        username: socket.username,
        message: `${socket.username} joined the room`
      });

      // Send room info to user
      socket.emit('room-joined', {
        roomId: room.id,
        roomName: room.name,
        roomCode: room.code,
        expiresAt: room.expiresAt
      });

      console.log(`User ${socket.username} joined room ${roomCode}`);
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  socket.on('send-message', async (data) => {
    try {
      if (!socket.roomCode || !socket.roomId) {
        socket.emit('error', 'Not in a room');
        return;
      }

      const { message } = data;

      if (!message || message.trim().length === 0) {
        return;
      }

      // Check if room is still valid
      const room = await prisma.room.findUnique({
        where: { id: socket.roomId }
      });

      if (!room || room.isExpired || new Date() > room.expiresAt) {
        socket.emit('error', 'Room has expired');
        return;
      }

      // Save message to database
      const newMessage = await prisma.message.create({
        data: {
          content: message.trim(),
          userId: socket.userId,
          roomId: socket.roomId
        }
      });

      // Broadcast message to room
      const messageData = {
        id: newMessage.id,
        content: newMessage.content,
        username: socket.username,
        createdAt: newMessage.createdAt
      };

      io.to(socket.roomCode).emit('new-message', messageData);

      console.log(`Message from ${socket.username} in room ${socket.roomCode}: ${message}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomCode && socket.roomId) {
      // Remove from active room participants
      if (activeRooms.has(socket.roomId)) {
        activeRooms.get(socket.roomId).participants.delete(socket.userId);
      }

      // Notify room that user left
      socket.to(socket.roomCode).emit('user-left', {
        username: socket.username,
        message: `${socket.username} left the room`
      });
    }

    console.log(`User ${socket.username} disconnected`);
  });
});

// Cleanup expired rooms every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find expired rooms
    const expiredRooms = await prisma.room.findMany({
      where: {
        expiresAt: {
          lte: now
        },
        isExpired: false
      }
    });

    if (expiredRooms.length > 0) {
      // Mark rooms as expired
      await prisma.room.updateMany({
        where: {
          id: {
            in: expiredRooms.map(room => room.id)
          }
        },
        data: {
          isExpired: true
        }
      });

      // Notify connected users and clean up
      for (const room of expiredRooms) {
        // Notify all users in the room
        io.to(room.code).emit('room-expired', {
          message: 'This room has expired and will be closed.'
        });

        // Disconnect all sockets from the room
        const socketsInRoom = await io.in(room.code).allSockets();
        for (const socketId of socketsInRoom) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            socket.leave(room.code);
          }
        }

        // Remove from active rooms
        activeRooms.delete(room.id);
      }

      console.log(`Expired ${expiredRooms.length} rooms`);
    }
  } catch (error) {
    console.error('Room cleanup error:', error);
  }
});

// Delete expired rooms and their messages after 24 hours
cron.schedule('0 * * * *', async () => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await prisma.room.deleteMany({
      where: {
        isExpired: true,
        expiresAt: {
          lte: cutoffTime
        }
      }
    });

    if (result.count > 0) {
      console.log(`Deleted ${result.count} old expired rooms`);
    }
  } catch (error) {
    console.error('Room deletion error:', error);
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});