const express = require('express');
const app = express();
const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

app.use(express.static(__dirname));

const users = {}; // socket.id => username

io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  socket.on('set username', (username) => {
    users[socket.id] = username;
    console.log(`👤 User ${socket.id} set username to: ${username}`);
    socket.broadcast.emit('system message', `${username} has joined the chat.`);
    io.emit('user list', Object.values(users)); // Update all clients
  });

  socket.on('chat message', (msg) => {
    const user = users[socket.id] || 'Anonymous';
    console.log(`💬 Message from ${user}: ${msg}`);
    io.emit('chat message', { user, msg });
  });

  // Typing events
  socket.on('typing', () => {
    const username = users[socket.id];
    if (username) {
      console.log(`${username} is typing...`);
      socket.broadcast.emit('user typing', username);
    }
  });
  
  socket.on('stop typing', () => {
    const username = users[socket.id];
    if (username) {
      console.log(`${username} stopped typing.`);
      socket.broadcast.emit('user stopped typing', username);
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    delete users[socket.id];
    if (user) {
      socket.broadcast.emit('system message', `${user} has left the chat.`);
      io.emit('user list', Object.values(users)); // Update all clients
    }
    console.log(`❌ ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
