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
  END: "Game has ended",
});

const Variant = Object.freeze({
  NORMAL: "normal",
  RANDOMIZER: "randomizer",
  LIMITED: "limited",
});

class Lobby {
  constructor(name, variant, count, players, status, hostUuid) {
    this.name = name;
    this.code = randcode();
    this.variant = variant;
    this.count = count;
    this.players = []; // Array of player objects
    this.status = status || LobbyStatus.AWAITING_PLAYERS;
    this.round = 0;
    this.phase = 0;
    this.activePlayer = 0; //Active's player turn, 0 is dealer because dealer is always first couse he's host
    this.hostUuid = hostUuid; // Store the permanent ID
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

const GamePhase = Object.freeze({
  DEALING: "DEALING",
  BETTING_1: "BETTING_1",
  EXCHANGE: "EXCHANGE",
  DEALING_2: "DEALING_2",
  BETTING_2: "BETTING_2",
  SHOWDOWN: "SHOWDOWN"
});

class PlayerGame {
  constructor(username, uuid) {
    this.username = username;
    this.uuid = uuid;
    this.hand = [];
    this.money = 10000;
    this.currentBet = 0;
    this.folded = false;
    this.role = "PLAYER"; // DEALER, ACCOMPLICE, PLAYER
    this.hasSkippedExchange = false;
  }
}

function createDeck() {
  const suits = ['S', 'H', 'C', 'D'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K', 'A'];
  let deck = [];
  for (let s of suits) for (let r of ranks) deck.push(r + s);
  return deck.sort(() => Math.random() - 0.5);
}

// PLACEHOLDER
function evaluateHandValue(hand) {
  if (!hand || hand.length === 0) return 0;
  const values = { '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '0':10, 'J':11, 'Q':12, 'K':13, 'A':14 };
  let score = 0;
  hand.forEach(card => score += values[card[0]]);
  return score;
}

// let PlayerMap = new Map();
let PlayerArr = [];
const LobbyMap = new Map();

const activeSockets = {};

//sample lobbies
const lobbyTest = new Lobby(
  "test",
  Variant.NORMAL,
  5,
  LobbyStatus.AWAITING_PLAYERS,
  "aaa",
);
const lobbyTest2 = new Lobby(
  "test2",
  Variant.LIMITED,
  6,
  LobbyStatus.AWAITING_PLAYERS,
  "aaa",
);
LobbyMap.set(`ROOM_${lobbyTest.code}`, lobbyTest);
LobbyMap.set(`ROOM_${lobbyTest2.code}`, lobbyTest2);

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

  if (!jwt.verify(token, secretKeyMOVETOENV)) {
    return next(new Error("Missing token"));
  }
  const user = getTokenData(token);

  if (user) {
    let player = PlayerArr.filter((p) => p.uuid == user.uuid)[0];

    if (player) {
      const index = PlayerArr.findIndex((p) => p.uuid === user.uuid);
      // player.rooms = player.rooms.filter((r) => !r.includes("ROOM"));

      const playerUpdate = setUpPlayerRefresh(user, player, socket);
      PlayerArr[index] = playerUpdate;
    } else {
      console.log("newplayer");
      console.log(user.uuid);
      
      
      let newPlayer = new Player(user.username, user.uuid, socket.id, [
        socket.id,
        "lobby",
      ]);

      PlayerArr.push(newPlayer);
    }
  } else {
    return false;
  }

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

  socket.on("CREATE_LOBBY", ({lobbyName,token}) => {
    // 1. Create the player object using the persistent UUID
    
    const data = getTokenData(token.value)
    

    // 2. Create the lobby using the player object (which contains the uuid)
    const lobby = createLobby(lobbyName, data.uuid);

    if (!lobby) {
      socket.emit("LOBBY_FAILED", {
        status: Status.FAILED,
        data: "Failed to create lobby",
      });
    } else {
      socket.join(`ROOM_${lobby.code}`);

      socket.emit("LOBBY_CREATED", {
        status: Status.COMPLETED,
        lobby: lobby,
      });

      // Notify everyone of the updated lobby list
      const updatedList = Array.from(LobbyMap.entries());
      io.to("lobby").emit("LOBBY_LIST", updatedList);
    }
  });
  socket.on("JOIN_LOBBY", ({ userName, lobbyCode }) => {
    const index = PlayerArr.findIndex((p) => p.socket == socket.id);
    let player = PlayerArr.filter((p) => p.socket == socket.id)[0];

    //guardrail if player leaves room via url
    const roomsWithRoom = player.rooms.filter((r) => r.includes("ROOM"));
    // Print those specific names
    roomsWithRoom.forEach((roomName) => {
      userLeftLobby(player.socket, roomName.split("_")[1]);
    });

    console.log("User joining lobby:", userName, lobbyCode);
    socket.join(`ROOM_${lobbyCode}`);
    socket.leave("lobby");
    socket.emit("JOINED_LOBBY", lobbyCode);
    setCurrentRooms(socket, lobbyCode, userName);
  });

  socket.on("DISCONNECT", () => {
    console.log("&*&!@&^!*&^$SOMEONE IS LEAVING");
  });

  socket.on("TESTING", (data) => {
    console.log(`Socket ${socket.id} is accessing testing event`);
    console.log(`Rooms:`);

    socket.emit("TESTING",{data:"chuj"})
  });

  // socket.on("GET_GAME_DATA",(lobby)=>{
  //   console.log("getgamedata");
  //   //find player

  //   const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
  //   const globalPlayer = PlayerArr.find((p) => p.socket === socket.id);
  //   const gamePlayer = lobbyData.players.find((p) => p.uuid === globalPlayer.uuid);

  //   const response = {
  //     round: lobbyData.round,
  //     phase: lobbyData.phase,
  //     player: gamePlayer || null
  //   };
  //   console.log(response)
  //   socket.emit("GAME_DATA",{data:response})
    
  // })

  socket.on("ROOM_HELLO", ({ data: lobbyCode, uuid, userName }) => {
    // 1. Ensure the user is actually added to the lobby's player list here
    // before broadcasting, otherwise the joining player won't see themselves!

    const players = getRoomData(lobbyCode);
    if (!players) {
      socket.emit("NOT_FOUND");
    } else {
      io.to(`ROOM_${lobbyCode}`).emit("ROOM_REFRESH", { playerList: players });
    }
  });

  socket.on("LOBBYMSG", ({ message, lobby, userName }) => {
    console.log("msg");

    io.to(`ROOM_${lobby}`).emit("LOBBYMSG", {
      message: message,
      username: userName,
    });
  });

  socket.on("START_GAME", async ({ lobby, uuid }) => {
    const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
    if (!lobbyData || lobbyData.players[0].uuid !== uuid) {
      return socket.emit("errorResponse", { message: "Only the host can start the game." });
    }
    if (lobbyData.players.length < 2) {
      return socket.emit("errorResponse", { message: "Need at least 2 players." });
    }

    lobbyData.status = LobbyStatus.ONGOING;
    lobbyData.phase = GamePhase.DEALING;
    lobbyData.deck = createDeck();
    lobbyData.pot = 0;
    lobbyData.currentBet = 0;
    lobbyData.winnerData = null;

    // Przypisanie ról
    lobbyData.players[0].role = "DEALER";
    // Losowanie wspólnika (ACCOMPLICE) spośród pozostałych
    const randIdx = Math.floor(Math.random() * (lobbyData.players.length - 1)) + 1;
    lobbyData.players[randIdx].role = "ACCOMPLICE";

    // Ustawienie tury na pierwszego gracza po Dealerze
    lobbyData.turnIndex = 1; 

    // Reset graczy
    lobbyData.players.forEach((p) => {
      p.hand = [];
      p.currentBet = 0;
      p.folded = false;
      p.hasSkippedExchange = false;
    });

    LobbyMap.set(`ROOM_${lobby}`, lobbyData);
    io.to(`ROOM_${lobby}`).emit("GAME_STARTED");
    io.to(`ROOM_${lobby}`).emit("REFRESH_GAME_DATA");
  });

  socket.on("GET_GAME_DATA", (lobby) => {
    const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
    if(!lobbyData) return;
    const globalPlayer = PlayerArr.find((p) => p.socket === socket.id);
    const gamePlayer = lobbyData.players.find((p) => p.uuid === globalPlayer.uuid);
    const isDealer = gamePlayer.role === "DEALER";

    const isDealingPhase = lobbyData.phase === GamePhase.DEALING || lobbyData.phase === GamePhase.DEALING_2;

    const sanitizedPlayers = lobbyData.players.map(p => ({
      username: p.username,
      uuid: p.uuid,
      money: p.money,
      currentBet: p.currentBet,
      folded: p.folded,
      cardCount: (isDealer || !isDealingPhase) ? p.hand.length : "?",
      role: isDealer || p.uuid === globalPlayer.uuid ? p.role : "???",
      hand: (isDealer || lobbyData.phase === GamePhase.SHOWDOWN || (p.uuid === globalPlayer.uuid && !isDealingPhase)) ? p.hand : []
    }));

    const response = {
      phase: lobbyData.phase,
      pot: lobbyData.pot,
      currentHighestBet: lobbyData.currentBet,
      turnIndex: lobbyData.turnIndex,
      activePlayerUuid: lobbyData.players[lobbyData.turnIndex].uuid,
      players: sanitizedPlayers,
      topCards: isDealer && isDealingPhase ? lobbyData.deck.slice(0, 2) : [],
      winnerData: lobbyData.winnerData
    };
    socket.emit("GAME_DATA", { data: response, myRole: gamePlayer.role, myUuid: gamePlayer.uuid });
  });

  socket.on("GAME_ACTION", ({ lobby, action, payload }) => {
    const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
    if (!lobbyData) return;

    const playingPlayers = lobbyData.players.filter(p => p.role !== "DEALER");

    if (action === "DEAL_CARD" && (lobbyData.phase === GamePhase.DEALING || lobbyData.phase === GamePhase.DEALING_2)) {
      const targetPlayer = playingPlayers.find(p => p.uuid === payload.targetUuid);
      if (targetPlayer && targetPlayer.hand.length < 5 && lobbyData.deck.length > 0) {
        targetPlayer.hand.push(lobbyData.deck.shift());
        
        const allDealt = playingPlayers.filter(p => !p.folded).every(p => p.hand.length === 5);
        if (allDealt) {
            lobbyData.phase = lobbyData.phase === GamePhase.DEALING ? GamePhase.BETTING_1 : GamePhase.BETTING_2;
        }
      }
    }

    if (action === "BET" && (lobbyData.phase === GamePhase.BETTING_1 || lobbyData.phase === GamePhase.BETTING_2)) {
      const pIndex = lobbyData.turnIndex;
      const player = lobbyData.players[pIndex];
      
      if (payload.type === "FOLD") {
        player.folded = true;
      } else {
        let amountToAdd = payload.amount; 
        if (player.money < amountToAdd) amountToAdd = player.money; //All in

        player.money -= amountToAdd;
        player.currentBet += amountToAdd;
        lobbyData.pot += amountToAdd;
        
        if (player.currentBet > lobbyData.currentBet) {
          lobbyData.currentBet = player.currentBet;
        }
      }

      const activePlayers = playingPlayers.filter(p => !p.folded);
      const allMatchedOrAllIn = activePlayers.every(p => p.currentBet === lobbyData.currentBet || p.money === 0);
      
      if (activePlayers.length === 1 || allMatchedOrAllIn) {
        if (lobbyData.phase === GamePhase.BETTING_1) lobbyData.phase = GamePhase.EXCHANGE;
        else if (lobbyData.phase === GamePhase.BETTING_2) doShowdown(lobbyData, playingPlayers);
        
        lobbyData.currentBet = 0;
        playingPlayers.forEach(p => p.currentBet = 0);
        
        lobbyData.turnIndex = 1;
        while(lobbyData.turnIndex < lobbyData.players.length && lobbyData.players[lobbyData.turnIndex].folded) {
            lobbyData.turnIndex++;
        }
      } else {
        do {
          lobbyData.turnIndex = (lobbyData.turnIndex + 1) % lobbyData.players.length;
        } while (lobbyData.players[lobbyData.turnIndex].folded || lobbyData.players[lobbyData.turnIndex].role === "DEALER");
      }
    }

    if (action === "EXCHANGE_CARDS" && lobbyData.phase === GamePhase.EXCHANGE) {
       const player = playingPlayers.find(p => p.uuid === payload.uuid);
       if(player && !player.hasSkippedExchange) {
         
         const removedCards = player.hand.filter((_, index) => payload.cardsToRemove.includes(index));
         const newHand = player.hand.filter((_, index) => !payload.cardsToRemove.includes(index));
         

         lobbyData.deck.push(...removedCards);
         lobbyData.deck.sort(() => Math.random() - 0.5);
         
         player.hand = newHand; 
         player.hasSkippedExchange = true;
       }

       const activePlayers = playingPlayers.filter(p => !p.folded);
       const allExchanged = activePlayers.every(p => p.hasSkippedExchange);
       if(allExchanged) {
         lobbyData.phase = GamePhase.DEALING_2;
       }
    }

    if (action === "NEXT_ROUND" && lobbyData.phase === GamePhase.SHOWDOWN) {
        lobbyData.phase = GamePhase.DEALING;
        lobbyData.pot = 0;
        lobbyData.currentBet = 0;
        lobbyData.deck = createDeck();
        lobbyData.winnerData = null;
        lobbyData.turnIndex = 1;
        playingPlayers.forEach(p => {
          p.hand = [];
          p.folded = false;
          p.hasSkippedExchange = false;
        });
    }

    LobbyMap.set(`ROOM_${lobby}`, lobbyData);
    io.to(`ROOM_${lobby}`).emit("REFRESH_GAME_DATA"); 
  });

  // Dodaj parametr playingPlayers do doShowdown
  function doShowdown(lobbyData, playingPlayers) {
    lobbyData.phase = GamePhase.SHOWDOWN;
    const activePlayers = playingPlayers.filter(p => !p.folded);
    
    if (activePlayers.length === 0) return; // Zabezpieczenie

    let winner = activePlayers[0];
    let bestScore = evaluateHandValue(winner.hand);

    for (let i = 1; i < activePlayers.length; i++) {
      let score = evaluateHandValue(activePlayers[i].hand);
      if (score > bestScore) {
        bestScore = score;
        winner = activePlayers[i];
      }
    }

    winner.money += lobbyData.pot;
    lobbyData.winnerData = { username: winner.username, pot: lobbyData.pot };
  }


  socket.on("GO_BACK", () => {
    emitLobbyList();
  });
  //lobbyDepreciated
  socket.on("LEFT_LOBBY", ({ userName, lobby }) => {
    console.log(`User ${userName} left lobby, ${lobby}`);
    userLeftLobby(socket.id, lobby);
    socket.leave(`ROOM_${lobby}`);
    emitLobbyList();
  });

  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.id} left: ${reason}`);
    // PlayerArr = PlayerArr.filter((user) => user.socket != socket.id);
  });

  //   // Get the room object
  // const room = io.sockets.adapter.rooms.get('lobby_123');
  // // Check if the room exists and get the count
  // const count = room ? room.size : 0;
  // console.log(`There are ${count} users in the room.`);

  function createLobby(lobbyName, uuid) {
    // Ensure 'player' is an object that contains { username, uuid, socket }
    let player =PlayerArr.find((p) => p.uuid === uuid);
   
    
    // Pass the player's uuid as the hostUuid
    const lobby = new Lobby(
      lobbyName,
      Variant.NORMAL,
      5,
      [player],
      LobbyStatus.AWAITING_PLAYERS,
      player.uuid, // The creator is the host
    );

    LobbyMap.set(`ROOM_${lobby.code}`, lobby);
    emitLobbyList();
    return lobby;
  }

  function emitLobbyList() {
    const updatedList = Array.from(LobbyMap.entries());
    // io.to("lobby").emit("LOBBY_LIST", updatedList); .to("lobby") generates problems
    io.emit("LOBBY_LIST", updatedList);
  }

  function getRoomData(lobbyCode) {
    const fetchedLobby = LobbyMap.get(`ROOM_${lobbyCode}`);
    if (!fetchedLobby) return null;

    // Return objects so the client can use the UUID
    const usernames = fetchedLobby.players.map((player) => player.username);
    return usernames;
  }
});

function userLeftLobby(socketId, lobbyCode) {
  // 1. Guard: Check if lobby exists in the map

  const lobby = LobbyMap.get(`ROOM_${lobbyCode}`);
  if (!lobby) {
    console.log("Lobby already deleted or does not exist, skipping.");
    return;
  }

  const index = PlayerArr.findIndex((p) => p.socket == socketId);
  let player = PlayerArr.filter((p) => p.socket == socketId)[0];

  // 2. Check if the player is actually in this lobby before filtering
  const playerIndex = lobby.players.findIndex((p) => p.uuid === player.uuid);
  if (playerIndex === -1) {
    console.log("Player not found in this lobby, skipping.");
    return;
  }

  player.rooms = player.rooms.filter((r) => r != `ROOM_${lobbyCode}`);
  player.rooms.push("lobby");
  PlayerArr[index] = player;

  // 3. Proceed with the logic
  lobby.players.splice(playerIndex, 1);
  const usernames = lobby.players.map((player) => player.username);
  if (lobby.players.length > 0) {
    LobbyMap.set(`ROOM_${lobby.code}`, lobby);
    io.to(`ROOM_${lobbyCode}`).emit("ROOM_REFRESH", {
      playerList: usernames,
    });
  } else {
    LobbyMap.delete(`ROOM_${lobby.code}`);
  }
}

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

  const tokenString = `${data.uuid}TOKENSTRING${data.username}`;

  let token = jwt.sign(tokenString, secretKeyMOVETOENV);
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

  const result = checkRouteAccess(tokenData, req.body.code);

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

  const uuid = raw.split("TOKENSTRING")[0];
  const userName = raw.split("TOKENSTRING")[1];

  return { username: userName, uuid: uuid };
}

function setUpPlayerRefresh(refreshData, player, socket) {
  console.log("user exists asign token and rooms");
  console.log(refreshData);
  console.log(player);

  console.log(player.rooms);

  player.username !== refreshData.name ? refreshData.name : player.username;
  const roomValue = player.rooms.find((room) => {
    if (room.startsWith("ROOM_")) {
      return true; // <--- This tells find() "I found it!"
    }
    return false; // <--- Optional, but good practice
  });

  if (roomValue != null) {
    socket.join(roomValue);
    socket.leave("lobby");
    player.rooms = [roomValue, socket.id];
  } else {
    player.rooms = [socket.id, "lobby"];
  }

  player.socket = socket.id;

  return player;
}

function setCurrentRooms(socket, lobbyCode, userName) {
  const index = PlayerArr.findIndex((p) => p.socket == socket.id);
  let player = PlayerArr.filter((p) => p.socket == socket.id)[0];
  player.rooms = Array.from(socket.rooms);
  player.rooms = player.rooms.filter((r) => r != "lobby");

  PlayerArr[index] = player;
  console.log(LobbyMap);

  const lobby = LobbyMap.get(`ROOM_${lobbyCode}`);

  // let arr = lobby.players

  const playerGame = new PlayerGame(userName, player.uuid);

  lobby.players.push(playerGame);
  LobbyMap.set(`ROOM_${lobbyCode}`, lobby);
}

function checkRouteAccess(tokenData, code) {
  // Use .find() to get the specific object, not an array of objects
  const player = PlayerArr.find((p) => p.uuid === tokenData.uuid);

  // Add a safety check in case the player isn't found
  if (player) {
    const allow = player.rooms.includes(`ROOM_${code}`);
    return allow;
  } else {
    return false;
  }
}

function randcode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function getPlayersInRoom(lobbyCode) {
  const lobby = LobbyMap.get(lobbyCode);
  if (!lobby) return [];

  // Return an array of player objects associated with this lobby
  return lobby.players;
}
