// const { WebSocketServer } = require("ws");
import { Server } from "socket.io";
import jwt from 'jsonwebtoken' 


const secretKeyMOVETOENV = "taxtimehowmuchsecret"
const Status = Object.freeze({
  IN_PROGRESS: "IN_PROGRESS",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
});

const Variant = Object.freeze({
  NORMAL: "normal",
  RANDOMIZER: "randomizer",
});

class Lobby {
  constructor(name, variant, count, players) {
    this.name = name;
    this.variant = variant;
    this.count = count;
    this.players = [];
  }
}

let PlayerMap = new Map();
let PlayerArr = [];
let LobbyMap = new Map();

const activeSockets = {};

//sample lobbies
const lobbyTest = new Lobby("test", Variant.NORMAL, 5);
const lobbyTest2 = new Lobby("test2", Variant.RANDOMIZER, 6);
LobbyMap.set(0, lobbyTest);
LobbyMap.set(1, lobbyTest2);

// const wss = new WebSocketServer({ port: 1145 });

const io = new Server({
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.listen(1145);

// make all Socket instances disconnect
// io.disconnectSockets();


io.use((socket, next) => {
  // Access the token sent from the client
  const token = socket.handshake.auth.token;

  console.log("validating");

  if (!jwt.verify(token,secretKeyMOVETOENV)) {
    console.log("FALSE");
    return next(new Error("Missing token"));
  }


   console.log("TRUE");
  // Validate the token...
  // if valid:
  next();
});

io.on("connection", (socket) => {
  console.log(`User ${socket.userId} connected with socket ID: ${socket.id}`);
  activeSockets[socket.id] = socket;
  PlayerArr.push(socket.id);

  const lobbyArray = Array.from(LobbyMap.entries());
  socket.emit("LOBBY_LIST", lobbyArray);

  socket.on("CREATE_LOBBY", ({ userName, lobbyName }) => {
    console.log("User creating lobby:", userName, "Name:", lobbyName);

    const lobby = createLobby(lobbyName);

    if (!lobby) {
      socket.emit("LOBBY_FAILED", { status: Status.FAILED, data: "nic" });
    } else {
      socket.emit("LOBBY_CREATED", { status: Status.COMPLETED, lobby: lobby });

      // Notify EVERYONE of the updated lobby list SUBJECT TO CHANGE
      const updatedList = Array.from(LobbyMap.entries());
      io.emit("LOBBY_LIST", updatedList);
    }
  });

  socket.on("JOIN_LOBBY", ({ userName, lobbyName }) => {
    console.log("User joining lobby:", userName, lobbyName);
    socket.join(lobbyName);
    console.log(socket.rooms);
  });

  socket.on("JOINED_LOBBY", ({ lobbyName }) => {
    console.log("USER " + socket.id + "JOINED LOBBY: " + lobbyName);
  });

  socket.on("disconnect", (reason) => {
    // console.log(`User ${socket.id} left: ${reason}`);
    PlayerArr = PlayerArr.filter((user) => user != socket.id);
    console.log(PlayerArr);
  });

  //   // Get the room object
  // const room = io.sockets.adapter.rooms.get('lobby_123');

  // // Check if the room exists and get the count
  // const count = room ? room.size : 0;

  // console.log(`There are ${count} users in the room.`);

  function createLobby(lobbyName, player) {
    let players = [];
    players.push(player);
    const lobby = new Lobby(lobbyName, Variant.NORMAL, 5, players);
    PlayerMap.set(lobbyName, lobby);

    LobbyMap.set(LobbyMap.size, lobby);
    console.log(LobbyMap);
    io.emit("LOBBY_LIST", lobbyArray);
    return lobby;
  }
});

import express from 'express';
import cors from 'cors'
const app = express();
const port = 3001;

const corsOptions = {
  origin: "http://localhost:3000", // Allow your frontend
  methods: ["GET", "POST"],
}


app.use(express.json());
app.use(cors(corsOptions)); // Apply it


//DEBUGING
// app.use((req, res, next) => {
//   console.log('Incoming Headers:', req.headers);
//   next();
// });

app.post('/api/token', (req, res) => {
  let data = req.body
  // console.log(data.uuid);
  
  let token = jwt.sign(data.uuid,secretKeyMOVETOENV);
  // console.log("token",token);
  res.send(token)

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})