// const { WebSocketServer } = require("ws"); // Nie używany
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pkg from 'pokersolver';
const { Hand } = pkg;

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
    this.phase = GamePhase.DEALING;
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
  SHOWDOWN: "SHOWDOWN",
  VOTING: "VOTING",
  VOTING_RESULT: "VOTING_RESULT"
});

class PlayerGame {
  constructor(username, uuid) {
    this.username = username;
    this.uuid = uuid;
    this.hand = [];
    this.money = 10000;
    this.currentBet = 0;
    this.folded = false;
    this.role = "PLAYER";
    this.hasSkippedExchange = false;
    this.eliminated = false;
  }
}

// === ZMIANA 1: Nowa reprezentacja kart na backendzie ===
function createDeck() {
  const suits = ['S', 'H', 'C', 'D']; // Pik, Kier, Trefl, Karo
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K', 'A'];
  let deck = [];
  // Zamiast '2S', tworzymy obiekty: { rank: '2', suit: 'S' }
  for (let s of suits) {
    for (let r of ranks) {
      deck.push({ rank: r, suit: s });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}


// let PlayerMap = new Map();
let PlayerArr = [];
const LobbyMap = new Map();

const activeSockets = {};

//sample lobbies
// const lobbyTest = new Lobby(
//   "test",
//   Variant.NORMAL,
//   5,
//   LobbyStatus.AWAITING_PLAYERS,
//   "aaa",
// );
// const lobbyTest2 = new Lobby(
//   "test2",
//   Variant.LIMITED,
//   6,
//   LobbyStatus.AWAITING_PLAYERS,
//   "aaa",
// );
// LobbyMap.set(`ROOM_${lobbyTest.code}`, lobbyTest);
// LobbyMap.set(`ROOM_${lobbyTest2.code}`, lobbyTest2);

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

  socket.on("CREATE_LOBBY", ({ lobbyName, token }) => {
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
  });


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
    lobbyData.round = 1;
    lobbyData.winnerData = null;
    lobbyData.votes = {};

    lobbyData.players[0].role = "DEALER";
    const randIdx = Math.floor(Math.random() * (lobbyData.players.length - 1)) + 1;
    lobbyData.players[randIdx].role = "ACCOMPLICE";

    lobbyData.turnIndex = 1;

    const baseBet = 100 * Math.pow(2, lobbyData.round - 1);
    lobbyData.currentBet = baseBet;

    lobbyData.players.forEach((p) => {
      p.hand = [];
      p.folded = false;
      p.hasSkippedExchange = false;
      p.eliminated = false;

      if (p.role === "DEALER") {
        p.money = 0;
        p.currentBet = 0;
      } else {
        let contribution = Math.min(p.money, baseBet);
        p.money -= contribution;
        p.currentBet = contribution;
        lobbyData.pot += contribution;
      }
    });

    LobbyMap.set(`ROOM_${lobby}`, lobbyData);
    io.to(`ROOM_${lobby}`).emit("GAME_STARTED");
    io.to(`ROOM_${lobby}`).emit("REFRESH_GAME_DATA");
  });

  socket.on("GET_GAME_DATA", (lobby) => {
    const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
    if (!lobbyData) return;
    const globalPlayer = PlayerArr.find((p) => p.socket === socket.id);
    if (!globalPlayer) return; // safety
    const gamePlayer = lobbyData.players.find((p) => p.uuid === globalPlayer.uuid);
    if (!gamePlayer) return;
    const isDealer = gamePlayer.role === "DEALER";

    const isDealingPhase = lobbyData.phase === GamePhase.DEALING || lobbyData.phase === GamePhase.DEALING_2;

    // === ZMIANA 2: Sanitizacja kart (wysyłanie obiektów zamiast stringów) ===
    const sanitizedPlayers = lobbyData.players.map(p => ({
      username: p.username,
      uuid: p.uuid,
      money: p.money,
      currentBet: p.currentBet,
      folded: p.folded,
      eliminated: p.eliminated,
      cardCount: p.hand?.length || 0, // Zmiana sanitizacji cardCount
      role: (isDealer || p.uuid === globalPlayer.uuid) ? (p.role || "???") : "???",
      // Wysyłamy obiekty kart, jeśli faza na to pozwala
      hand: (isDealer || (lobbyData.phase === GamePhase.SHOWDOWN && !p.folded) || (p.uuid === globalPlayer.uuid && !isDealingPhase)) ? (p.hand || []) : []
    }));

    const response = {
      phase: lobbyData.phase,
      pot: lobbyData.pot,
      currentHighestBet: lobbyData.currentBet,
      turnIndex: lobbyData.turnIndex,
      activePlayerUuid: lobbyData.players[lobbyData.turnIndex] ? lobbyData.players[lobbyData.turnIndex].uuid : null,
      players: sanitizedPlayers,
      // TopCards to też obiekty
      topCards: isDealer && isDealingPhase ? lobbyData.deck.slice(0, 2) : [],
      winnerData: lobbyData.winnerData,
      round: lobbyData.round,
      kickedPlayer: lobbyData.kickedPlayer,
      hostUuid: lobbyData.hostUuid,
      isGameOver: lobbyData.isGameOver || false
    };
    socket.emit("GAME_DATA", { data: response, myRole: gamePlayer.role, myUuid: gamePlayer.uuid });
  });

  socket.on("GAME_ACTION", ({ lobby, action, payload }) => {
    const lobbyData = LobbyMap.get(`ROOM_${lobby}`);
    if (!lobbyData) return;

    const playingPlayers = lobbyData.players.filter(p => p.role !== "DEALER" && !p.eliminated);

    if (action === "DEAL_CARD" && (lobbyData.phase === GamePhase.DEALING || lobbyData.phase === GamePhase.DEALING_2)) {
      const targetPlayer = playingPlayers.find(p => p.uuid === payload.targetUuid);
      // Deck zawiera obiekty, p.hand będzie zawierać obiekty
      if (targetPlayer && targetPlayer.hand.length < 5 && lobbyData.deck.length > 0) {
        targetPlayer.hand.push(lobbyData.deck.shift());

        const allDealt = playingPlayers.filter(p => !p.folded).every(p => p.hand.length === 5);
        if (allDealt) {
          lobbyData.phase = lobbyData.phase === GamePhase.DEALING ? GamePhase.BETTING_1 : GamePhase.BETTING_2;
          playingPlayers.forEach(p => p.hasActed = false);
        }
      }
    }

    if (action === "BET" && (lobbyData.phase === GamePhase.BETTING_1 || lobbyData.phase === GamePhase.BETTING_2)) {
      const pIndex = lobbyData.turnIndex;
      const player = lobbyData.players[pIndex];

      player.hasActed = true;

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
      const allMatchedAndActed = activePlayers.every(p => p.hasActed && (p.currentBet === lobbyData.currentBet || p.money === 0));

      if (activePlayers.length === 1) {
        doShowdown(lobbyData, playingPlayers);
        lobbyData.currentBet = 0;
        playingPlayers.forEach(p => p.currentBet = 0);
      }
      else if (allMatchedAndActed) {
        if (lobbyData.phase === GamePhase.BETTING_1) lobbyData.phase = GamePhase.EXCHANGE;
        else if (lobbyData.phase === GamePhase.BETTING_2) doShowdown(lobbyData, playingPlayers);

        lobbyData.currentBet = 0;
        playingPlayers.forEach(p => p.currentBet = 0);

        lobbyData.turnIndex = 1;
        while (lobbyData.turnIndex < lobbyData.players.length && (lobbyData.players[lobbyData.turnIndex].folded || lobbyData.players[lobbyData.turnIndex].eliminated || lobbyData.players[lobbyData.turnIndex].role === "DEALER")) {
          lobbyData.turnIndex++;
        }
        if (lobbyData.turnIndex >= lobbyData.players.length) lobbyData.turnIndex = 1;
      }
      else {
        do {
          lobbyData.turnIndex = (lobbyData.turnIndex + 1) % lobbyData.players.length;
        } while (lobbyData.players[lobbyData.turnIndex].folded || lobbyData.players[lobbyData.turnIndex].eliminated || lobbyData.players[lobbyData.turnIndex].role === "DEALER");
      }
    }

    if (action === "EXCHANGE_CARDS" && lobbyData.phase === GamePhase.EXCHANGE) {
      const player = playingPlayers.find(p => p.uuid === payload.uuid);
      if (player && !player.hasSkippedExchange) {
        const removedCards = player.hand.filter((_, index) => payload.cardsToRemove.includes(index));
        const newHand = player.hand.filter((_, index) => !payload.cardsToRemove.includes(index));

        // Deck nadal zawiera obiekty, dodajemy odrzucone obiekty
        lobbyData.deck.push(...removedCards);
        lobbyData.deck.sort(() => Math.random() - 0.5);

        player.hand = newHand;
        player.hasSkippedExchange = true;
      }

      const activePlayers = playingPlayers.filter(p => !p.folded);
      const allExchanged = activePlayers.every(p => p.hasSkippedExchange);

      if (allExchanged) {
        const anyoneNeedsCards = activePlayers.some(p => p.hand.length < 5);

        if (anyoneNeedsCards) {
          lobbyData.phase = GamePhase.DEALING_2;
        } else {
          lobbyData.phase = GamePhase.BETTING_2;
          playingPlayers.forEach(p => p.hasActed = false);
        }
      }
    }
    if (action === "START_VOTING" && lobbyData.phase === GamePhase.SHOWDOWN) {
      const activeNormalPlayers = lobbyData.players.filter(p => p.role !== "DEALER" && !p.eliminated);

      if (activeNormalPlayers.length <= 2) {
        lobbyData.phase = GamePhase.VOTING_RESULT;
        lobbyData.kickedPlayer = null;
      } else {
        lobbyData.phase = GamePhase.VOTING;
        lobbyData.votes = {};
        lobbyData.kickedPlayer = null;
      }
    }

    if (action === "CAST_VOTE" && lobbyData.phase === GamePhase.VOTING) {
      const targetP = lobbyData.players.find(p => p.uuid === payload.targetUuid);
      if (targetP && targetP.role === "DEALER") return;

      lobbyData.votes[payload.voterUuid] = payload.targetUuid;

      const eligibleVoters = playingPlayers;
      if (Object.keys(lobbyData.votes).length === eligibleVoters.length) {
        const counts = {};
        Object.values(lobbyData.votes).forEach(v => {
          if (v !== "PASS") counts[v] = (counts[v] || 0) + 1;
        });

        let kickedId = null;
        for (const [id, count] of Object.entries(counts)) {
          if (count >= 2) {
            kickedId = id;
            break;
          }
        }

        if (kickedId) {
          const kicked = lobbyData.players.find(p => p.uuid === kickedId);
          if (kicked) {
            kicked.eliminated = true;
            const dealer = lobbyData.players.find(p => p.role === "DEALER");
            if (dealer) dealer.money += kicked.money;
            kicked.money = 0;
            lobbyData.kickedPlayer = kicked.username;
          }
        } else {
          lobbyData.kickedPlayer = null;
        }

        checkTriggerCountdown(lobbyData);

        lobbyData.phase = GamePhase.VOTING_RESULT;
        checkEndGameCondition(lobbyData, false);
      }
    }

    if (action === "NEXT_ROUND" && lobbyData.phase === GamePhase.VOTING_RESULT) {
      lobbyData.phase = GamePhase.DEALING;
      lobbyData.pot = 0;
      lobbyData.round += 1;

      const baseBet = 100 * Math.pow(2, lobbyData.round - 1);
      lobbyData.currentBet = baseBet;
      lobbyData.deck = createDeck();
      lobbyData.winnerData = null;
      lobbyData.votes = {};
      lobbyData.turnIndex = 1;

      playingPlayers.forEach(p => {
        p.hand = [];
        p.folded = false;
        p.hasSkippedExchange = false;
        p.hasActed = false;

        let contribution = Math.min(p.money, baseBet);
        p.money -= contribution;
        p.currentBet = contribution;
        lobbyData.pot += contribution;

        if (p.money <= 0) {
          p.eliminated = true;
        }
      });

      checkTriggerCountdown(lobbyData);

      const forceEnd = lobbyData.targetEndRound && lobbyData.round > lobbyData.targetEndRound;
      checkEndGameCondition(lobbyData, forceEnd);

      if (lobbyData.phase !== GamePhase.SHOWDOWN) {
        while (lobbyData.turnIndex < lobbyData.players.length && (lobbyData.players[lobbyData.turnIndex].eliminated)) {
          lobbyData.turnIndex++;
        }
      }
    }

    LobbyMap.set(`ROOM_${lobby}`, lobbyData);
    io.to(`ROOM_${lobby}`).emit("REFRESH_GAME_DATA");
  });


  // === ZMIANA 3: Modyfikacja Showdown, aby obsługiwać obiekty kart ===
  function doShowdown(lobbyData, playingPlayers) {
    lobbyData.phase = GamePhase.SHOWDOWN;
    const activePlayers = playingPlayers.filter(p => !p.folded && !p.eliminated);

    if (activePlayers.length === 0) return;

    let hands = activePlayers.map(p => {
      // pokersolver oczekuje formatu 'Ks', '2h', 'Th' (gdzie T to 10).
      // Konwertujemy obiekty z powrotem na ten format TYLKO na potrzeby biblioteki.
      let solverCards = p.hand.map(card => {
        // '0' na backendzie oznacza '10', pokersolver potrzebuje 'T'.
        let rank = card.rank === '0' ? 'T' : card.rank;
        let suit = card.suit.toLowerCase(); // pokersolver oczekuje małych liter
        return rank + suit;
      });

      let solvedHand = Hand.solve(solverCards);
      solvedHand.uuid = p.uuid;
      return solvedHand;
    });

    let winners = Hand.winners(hands);
    let winnerUuid = winners[0].uuid;
    let winner = activePlayers.find(p => p.uuid === winnerUuid);

    winner.money += lobbyData.pot;
    lobbyData.winnerData = { username: winner.username, pot: lobbyData.pot, handName: winners[0].name };

    lobbyData.players.forEach(p => {
      if (p.role !== "DEALER" && p.money <= 0) {
        p.eliminated = true;
      }
    });

    checkTriggerCountdown(lobbyData);

    const forceEnd = lobbyData.targetEndRound && lobbyData.round >= lobbyData.targetEndRound;
    checkEndGameCondition(lobbyData, forceEnd);
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
    let player = PlayerArr.find((p) => p.uuid === uuid);
    const playerGame = new PlayerGame(player.username, player.uuid);

    const lobby = new Lobby(
      lobbyName,
      Variant.NORMAL,
      5,
      [playerGame],
      LobbyStatus.AWAITING_PLAYERS,
      player.uuid,
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
  const lobby = LobbyMap.get(`ROOM_${lobbyCode}`);

  const existingPlayer = lobby.players.find(p => p.uuid === player.uuid);

  if (!existingPlayer) {
    const playerGame = new PlayerGame(userName, player.uuid);
    lobby.players.push(playerGame);
  }

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

function checkEndGameCondition(lobbyData, forceEnd = false) {
  const remainingNormalPlayers = lobbyData.players.filter(p => p.role !== "DEALER" && !p.eliminated);

  if (remainingNormalPlayers.length <= 1 || forceEnd) {
    lobbyData.phase = GamePhase.SHOWDOWN;
    lobbyData.isGameOver = true;

    const dealerTeamMoney = lobbyData.players
      .filter(p => p.role === "DEALER" || p.role === "ACCOMPLICE")
      .reduce((sum, p) => sum + (p.money || 0), 0);

    const playerTeamMoney = lobbyData.players
      .filter(p => p.role === "PLAYER")
      .reduce((sum, p) => sum + (p.money || 0), 0);

    let msg = "";
    if (dealerTeamMoney > playerTeamMoney) {
      msg = `DRUŻYNA DEALERA WYGRYWA! (Dealer+Wspólnik: $${dealerTeamMoney} vs Gracze: $${playerTeamMoney})`;
    } else if (playerTeamMoney > dealerTeamMoney) {
      msg = `DRUŻYNA GRACZY WYGRYWA! (Gracze: $${playerTeamMoney} vs Dealer+Wspólnik: $${dealerTeamMoney})`;
    } else {
      msg = `REMIS! Obie drużyny skończyły z majątkiem $${dealerTeamMoney}`;
    }

    lobbyData.winnerData = {
      username: msg,
      pot: 0,
      handName: forceEnd ? "Koniec Gry - Limit Rund Osiągnięty" : "Koniec Gry - Brak Przeciwników"
    };
  }
}

function checkTriggerCountdown(lobbyData) {
  const hasEliminated = lobbyData.players.some(p => p.role !== "DEALER" && p.eliminated);

  if (hasEliminated && !lobbyData.targetEndRound) {
    lobbyData.targetEndRound = lobbyData.round + 3;
  }
}