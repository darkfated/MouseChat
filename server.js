const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://fonts.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
    }
}));

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

let userCount = 0;

io.on('connection', (socket) => {
    userCount++;
    io.emit('usercount', userCount);

    socket.on('newuser', (username) => {
        if (username.length <= 28) {
            socket.broadcast.emit('update', `${username} - зашёл на нашу вечеринку!`);
        }
    });

    socket.on('exituser', (username) => {
        userCount--;
        io.emit('usercount', userCount);
        socket.broadcast.emit('update', `${username} - вышел с чата`);
    });

    socket.on('chat', (message) => {
        if (message.text.length <= 200) {
            socket.broadcast.emit('chat', message);
        }
    });

    socket.on('disconnect', () => {
        if (userCount > 0) {
            userCount--;
            io.emit('usercount', userCount);
        }
    });
});

server.listen(5000, () => {
    console.log('Server is listening on port 5000');
});
