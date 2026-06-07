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

class Player {
  constructor(username, uuid, socket, rooms) {
    this.username = username;
    this.uuid = uuid;
    this.socket = socket;
    this.rooms = rooms;
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

  // socket.handshake.query.yourdata sending data

  // console.log("validating");

  if (!jwt.verify(token, secretKeyMOVETOENV)) {
    console.log("FALSE");
    return next(new Error("Missing token"));
  }
  console.log("checking if user is in the database");
  const user = getTokenData(token);

  if (user) {
    let player = PlayerArr.filter((p) => p.uuid == user.uuid)[0];
    
    console.log(PlayerArr);
    
   
    

    if (player) {
      //doing something and replacing current record
      //number
      const index = PlayerArr.findIndex((p) => p.uuid === user.uuid);
      
      console.log("*&*&%&^%&%$&$%^$%*&",player);
      console.log("*&*&%&^%&%$&$%^$%*&",user);
      
      
      const playerUpdate = setUpPlayerRefresh(user, player, socket);
      PlayerArr[index] = playerUpdate;
    } else {
      console.log("new player being created");
      // console.log(socket.rooms);

      let newPlayer = new Player(user.username, user.uuid, socket.id, [
        socket.id,
      ]);

      console.log("PLAYAERASR",newPlayer);
      
      PlayerArr.push(newPlayer);
      // console.log(newPlayer);
    }
  } else {
    return false;
  }

  //  console.log("TRUE");
  // Validate the token...
  // if valid:
  next();
});

io.on("connection", (socket) => {
  console.log(
    "$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$",
  );
  // console.log(socket);

  console.log(`User connected with socket ID: ${socket.id}`);
  activeSockets[socket.id] = socket;
  // PlayerArr.push(socket.id);

  const lobbyArray = Array.from(LobbyMap.entries());
  socket.emit("LOBBY_LIST", lobbyArray);

  socket.on("CREATE_LOBBY", ({ userName, lobbyName }) => {
    console.log("User creating lobby: Name:", lobbyName);

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
    socket.join(`ROOM_${lobbyName}`);
    // console.log(socket.rooms);
    socket.emit("JOINED_LOBBY", lobbyName);
    setCurrentRooms(socket);
  });

  // socket.on("JOINED_LOBBY", ({ lobbyName }) => {
  //   console.log("USER " + socket.id + "JOINED LOBBY: " + lobbyName);
  // });

  socket.on("TESTING", () => {
    console.log(`Socket ${socket.id} is accessing testing event`);
    console.log(`Rooms:`);
    console.log(socket.rooms);
  });


  socket.on("ROOM_HELLO",({data})=>{
    
    console.log(`User ${socket.id} in the room - letting know others`);
    console.log(`ROOM_${data}`);
    io.to(`ROOM_${data}`).emit("ROOM_REFRESH","nic")
  })

  socket.on("disconnect", (reason) => {
    // console.log(`User ${socket.id} left: ${reason}`);
    // PlayerArr = PlayerArr.filter((user) => user.socket != socket.id);
    // console.log("DELETING USER");
    // console.log(PlayerArr);
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

import express from "express";
import cors from "cors";
const app = express();
const port = 3001;

const corsOptions = {
  origin: "http://localhost:3000", // Allow your frontend
  methods: ["GET", "POST"],
};

app.use(express.json());
app.use(cors(corsOptions)); // Apply it

//DEBUGING
// app.use((req, res, next) => {
//   console.log('Incoming Headers:', req.headers);
//   next();
// });

//establishing initial connection
app.post("/api/token", (req, res) => {
  let data = req.body;
  // console.log(data.uuid);

  const tokenString = `${data.uuid}TOKENSTRING${data.username}`;

  let token = jwt.sign(tokenString, secretKeyMOVETOENV);
  // console.log("token",token);
  res.send(token);
});

app.post("/api/token/username", (req, res) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  const tokenData = getTokenData(token);

  res.send(tokenData.username);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function getTokenData(token) {
  if (!token) {
    console.log("Access Denied: No token provided");
    return false;
    // return res.status(401).json({ message: "Access Denied: No token provided" });
  }
  let raw = jwt.decode(token);
  // console.log('RAW',raw);
  const uuid = raw.split("TOKENSTRING")[0];
  const userName = raw.split("TOKENSTRING")[1];
  // console.log("username",raw.split("TOKENSTRING")[1]);
  // console.log('uuid', raw.split("TOKENSTRING")[0]);

  return { username: userName, uuid: uuid };
}

function setUpPlayerRefresh(refreshData, player, socket) {
  console.log("user exists asign token and rooms");

  // console.log(player);
  // console.log(player.username);
  // console.log(player.uuid);
  // console.log(player.rooms);

  player.username !== refreshData.name ? refreshData.name : player.username;
 const roomValue = player.rooms.find((room) => {
    // console.log("ROOOOOOOOOM", room);
    if (room.startsWith("ROOM_")) {
      // console.log("JEST");
      return true; // <--- This tells find() "I found it!"
    }
    return false; // <--- Optional, but good practice
});


  

  if (roomValue != null) {
    // console.log(roomValue);
    socket.join(roomValue)
    player.rooms = [roomValue, socket.id];
  } else {
    player.rooms = [socket.id];
  }

  player.socket = socket.id;
  // let currRooms = player.rooms.filter((room) => room == "ROOM_");
  // player.rooms = [

  // console.log(player);

  return player;
}

function setCurrentRooms(socket) {
  const index = PlayerArr.findIndex((p) => p.socket == socket.id);
  let player = PlayerArr.filter((p) => p.socket == socket.id)[0];

  player.rooms = Array.from(socket.rooms);

  // console.log(player.rooms);

  PlayerArr[index] = player
}
