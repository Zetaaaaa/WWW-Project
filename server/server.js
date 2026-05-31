const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 1145 });

const PlayerMap = new Map();
const LobbyMap = new Map();

wss.on("connection", (ws) => {
  console.log("New user connected");

  ws.on("message", (message) => {
    console.log("$$$$$$$$$$$$$$ { New Request recived } $$$$$$$$$$$$$$$$$$");

    const { username, type, data, lobbyName } = JSON.parse(message);

    console.log("Type: ", type, " Data: ", data);

    switch (type) {
      case "TEST":
        ws.send(
          JSON.stringify({
            type: "TestResponse",
            content: "i see your request!",
          }),
        );
        break;
      case "CREATE_LOBBY":
        //createlobbylogic
        console.log("CREATE_LOBBY");
        console.log("User creating lobby:", username);
        
        console.log("Lobby Name:", lobbyName);
        

        break;
      case "JOIN_LOBBY":
        console.log("JOIN_LOBBY");

        //joinlobby
        break;
    }
  });
});
