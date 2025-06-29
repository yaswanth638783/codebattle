const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const { mongoose } = require('mongoose');
const app = express();

// Database connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Database connected"))
  .catch((err) => console.log("Database not connected", err));

// Middleware
app.use(cors({
  credentials: true,
  origin: 'http://localhost:5173',
}));
app.use(express.json());

// Create server and socket.io instance
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Make io available to the app
app.set('io', io);

// Routes
app.use('/', require('./routes/authroute'));
app.use('/problems', require('./routes/problemroute'));
app.use('/submissions', require('./routes/submissionroute'));
app.use('/rooms', require('./routes/roomroute'));
app.use('/users', require('./routes/userroute'));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const port = 8000;
server.listen(port, () => console.log(`Server is running on port ${port}`));