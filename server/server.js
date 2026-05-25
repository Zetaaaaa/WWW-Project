const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 1145 });

wss.on("connection", (ws) => {
  console.log("New user connected");

  ws.on("message", (message) => {
    console.log("New Trafic!!!");
    console.log(JSON.parse(message));

    const { type, data } = JSON.parse(message);

    switch (type) {
      case "TEST":
        ws.send(
          JSON.stringify({
            type: "TestResponse",
            content: "i see your request!",
          }),
        );
        break;
      case "CreateLobby":
        //createlobbylogic
        break;
      case "JoinLobby":
        //joinlobby
        break;
    }
  });
});
