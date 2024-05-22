const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const helmet = require("helmet");
const { Validator } = require("jsonschema");
const compression = require("compression");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const validator = new Validator();

app.use(compression());
app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

let userCount = 0;
let activeUsers = {};

io.on("connection", (socket) => {
  userCount++;
  io.emit("usercount", userCount);

  socket.on("newuser", (username) => {
    if (
      !activeUsers[username] &&
      validator.validate(username, { type: "string", maxLength: 28 }).valid
    ) {
      activeUsers[username] = true;
      socket.username = username;
      socket.broadcast.emit("update", `${username} - зашёл на нашу вечеринку!`);
    } else {
      socket.emit("usernameExists", username);
    }
  });

  socket.on("exituser", () => {
    const username = socket.username;
    delete activeUsers[username];
    userCount--;
    io.emit("usercount", userCount);
    socket.broadcast.emit("update", `${username} - вышел с чата`);
  });

  socket.on("chat", (message) => {
    if (
      validator.validate(message.text, { type: "string", maxLength: 200 }).valid
    ) {
      socket.broadcast.emit("chat", message);
    }
  });

  socket.on("disconnect", () => {
    if (userCount > 0) {
      userCount--;
      io.emit("usercount", userCount);
    }
    const username = socket.username;
    if (username) {
      delete activeUsers[username];
      socket.broadcast.emit("update", `${username} - вышел с чата`);
    }
  });
});

app.get("/words", (req, res) => {
  const wordsFilePath = path.join(__dirname, "public/words.json");
  fs.readFile(wordsFilePath, "utf8", (err, data) => {
    if (err) {
      return;
    }
    res.json(JSON.parse(data));
  });
});

server.listen(5000, () => {
  console.log("Сервер запущен на порту 5000");
});
