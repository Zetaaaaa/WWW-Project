// const { WebSocketServer } = require("ws");
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const secretKeyMOVETOENV = "taxtimehowmuchsecret";
const Status = Object.freeze({
  IN_PROGRESS: "IN_PROGRESS",
  FAILED: "FAILED",
  COMPLETED: "COMPLETED",
});

const LobbyStatus = Object.freeze({
  AWAITING_PLAYERS: "Awaiting Players",
  READY: "Ready to start",
  ONGOING: "Game in progress",
  END: "Game has ended"
})

const Variant = Object.freeze({
  NORMAL: "normal",
  RANDOMIZER: "randomizer",
  LIMITED: "limited",
});

class Lobby {
  constructor(name, variant, count, players,status) {
    this.name = name;
    this.variant = variant;
    this.count = count;
    this.players = [];
    this.status = LobbyStatus.AWAITING_PLAYERS
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

class PlayerGame {
  constructor(username, uuid, hand) {
    this.username = username;
    this.uuid = uuid;
    this.hand = { c1: "XXX", c2: "XXX", c3:"XXX",c4: "XXX", c5:"xxx" };
  }
}

// let PlayerMap = new Map();
let PlayerArr = [];
const LobbyMap = new Map();

const activeSockets = {};

//sample lobbies
const lobbyTest = new Lobby("test", Variant.NORMAL, 5);
const lobbyTest2 = new Lobby("test2", Variant.LIMITED, 6);
LobbyMap.set("test", lobbyTest);
LobbyMap.set("test2", lobbyTest2);

// const wss = new WebSocketServer({ port: 1145 });

const io = new Server({
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
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
    // console.log("FALSE");
    return next(new Error("Missing token"));
  }
  // console.log("checking if user is in the database");
  const user = getTokenData(token);

  if (user) {
    let player = PlayerArr.filter((p) => p.uuid == user.uuid)[0];

    if (player) {
      //doing something and replacing current record
      //number
      const index = PlayerArr.findIndex((p) => p.uuid === user.uuid);

      const playerUpdate = setUpPlayerRefresh(user, player, socket);
      PlayerArr[index] = playerUpdate;
    } else {
      // console.log("new player being created");
      // console.log(socket.rooms);

      let newPlayer = new Player(user.username, user.uuid, socket.id, [
        socket.id,
        "lobby",
      ]);
      // console.log("PLAYAERASR", newPlayer);

      PlayerArr.push(newPlayer);
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
  let lobbyArray = [];
  console.log(`User connected with socket ID: ${socket.id}`);
  socket.join("lobby");
  activeSockets[socket.id] = socket;

  emitLobbyList();

  socket.on("CREATE_LOBBY", ({ userName, lobbyName }) => {
    // console.log("User creating lobby: Name:", lobbyName);

    const lobby = createLobby(lobbyName);

    if (!lobby) {
      socket.emit("LOBBY_FAILED", { status: Status.FAILED, data: "nic" });
    } else {
      socket.emit("LOBBY_CREATED", {
        status: Status.COMPLETED,
        lobby: lobby,
      });

      // Notify EVERYONE of the updated lobby list SUBJECT TO CHANGE
      const updatedList = Array.from(LobbyMap.entries());
      io.to("lobby").emit("LOBBY_LIST", updatedList);
    }
  });

  socket.on("JOIN_LOBBY", ({ userName, lobbyName }) => {
    console.log("User joining lobby:", userName, lobbyName);
    socket.join(`ROOM_${lobbyName}`);
    socket.leave("lobby");
    // console.log(socket.rooms);

    socket.emit("JOINED_LOBBY", lobbyName);
    setCurrentRooms(socket, lobbyName, userName);
  });

  socket.on("DISCONNECT", () => {
    console.log("&*&!@&^!*&^$SOMEONE IS LEAVING");
  });

  socket.on("TESTING", () => {
    console.log(`Socket ${socket.id} is accessing testing event`);
    // console.log(`Rooms:`);
    // console.log(PlayerArr);
  });

  socket.on("ROOM_HELLO", ({ data }) => {
    console.log(`User ${socket.id} in the room - letting know others`);
    console.log(`ROOM_${data}`);
    // console.log("DATA");
    // console.log(data);
    const players = fetchConnectedPeopleArray(data);
    io.to(`ROOM_${data}`).emit("ROOM_REFRESH", { playerList: players });
  });

  socket.on("GO_BACK", () => {
    emitLobbyList();
  });

  socket.on("LEFT_LOBBY", ({ userName, lobby }) => {
    console.log(`User ${userName} left lobby, ${lobby}`);
    userLeftLobby(socket.id, lobby);
    socket.leave(`ROOM_${lobby}`);
    emitLobbyList();
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.id} left: ${reason}`);
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
    // PlayerMap.set(lobbyName, lobby);

    LobbyMap.set(lobbyName, lobby);
    // console.log(LobbyMap);
    emitLobbyList();
    return lobby;
  }

  function emitLobbyList() {
    const updatedList = Array.from(LobbyMap.entries());
    // io.to("lobby").emit("LOBBY_LIST", updatedList); .to("lobby") generates problems
    io.emit("LOBBY_LIST", updatedList);
  }

  function fetchConnectedPeopleArray(lobbyName) {
    // console.log(LobbyMap);

    const fetchedLobby = LobbyMap.get(lobbyName);

    // console.log(fetchedLobby);
    const usernames = fetchedLobby.players.map((player) => player.username);
    return usernames;
  }

  function userLeftLobby(socketId, lobbyName) {
    // 1. Guard: Check if lobby exists in the map
    const lobby = LobbyMap.get(lobbyName);
    if (!lobby) {
      console.log("Lobby already deleted or does not exist, skipping.");
      return;
    }

    console.log("Processing leave logic for:", socketId);

    const index = PlayerArr.findIndex((p) => p.socket == socket.id);
    let player = PlayerArr.filter((p) => p.socket == socket.id)[0];

    // 2. Check if the player is actually in this lobby before filtering
    const playerIndex = lobby.players.findIndex((p) => p.uuid === player.uuid);
    if (playerIndex === -1) {
      console.log("Player not found in this lobby, skipping.");
      return;
    }

    player.rooms = player.rooms.filter((r) => r != `ROOM_${lobbyName}`);
    player.rooms.push("lobby");
    PlayerArr[index] = player;

    // 3. Proceed with the logic
    lobby.players.splice(playerIndex, 1);
    const usernames = lobby.players.map((player) => player.username);
    if (lobby.players.length > 0) {
      LobbyMap.set(lobbyName, lobby);
      io.to(`ROOM_${lobbyName}`).emit("ROOM_REFRESH", {
        playerList: usernames,
      });
    } else {
      LobbyMap.delete(lobbyName);
    }
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
  // console.log(data);

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

app.post("/api/route/checkAccess", (req, res) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  const tokenData = getTokenData(token);

  const result = checkRouteAccess(tokenData, req.body.route);
  console.log(result);

  res.send(result);
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
    socket.join(roomValue);
    socket.leave("lobby");
    player.rooms = [roomValue, socket.id];
  } else {
    player.rooms = [socket.id, "lobby"];
  }

  player.socket = socket.id;
  // let currRooms = player.rooms.filter((room) => room == "ROOM_");
  // player.rooms = [

  // console.log(player);

  return player;
}

function setCurrentRooms(socket, lobbyName, userName) {
  const index = PlayerArr.findIndex((p) => p.socket == socket.id);
  let player = PlayerArr.filter((p) => p.socket == socket.id)[0];
  player.rooms = Array.from(socket.rooms);
  player.rooms = player.rooms.filter((r) => r != "lobby");
  PlayerArr[index] = player;

  const lobby = LobbyMap.get(lobbyName);
  console.log("LOBBYY CURRENT ROOMS");

  console.log(LobbyMap);
  // let arr = lobby.players

  const playerGame = new PlayerGame(userName, player.uuid);

  lobby.players.push(playerGame);
  LobbyMap.set(lobbyName, lobby);

  console.log(lobby.players);
}

function checkRouteAccess(tokenData, route) {
  // console.log("ASDAS");
  // console.log(PlayerArr);
  console.log(route);

  // Use .find() to get the specific object, not an array of objects
  const player = PlayerArr.find((p) => p.uuid === tokenData.uuid);
  console.log(player);

  // Add a safety check in case the player isn't found
  if (player) {
    console.log("ROOMY", `ROOM_${route}`);
    console.log(player.rooms.includes(`ROOM_${route}`));

    const allow = player.rooms.includes(`ROOM_${route}`);
    return allow;
  } else {
    return false;
  }
}
