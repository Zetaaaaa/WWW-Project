'use client'
import { useEffect, useState } from "react";
import Actions from "./Components/Actions";
import ResponseBox from "./Components/ResponseBox"

function page() {

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [ws, setWs] = useState(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:1145');
    setWs(websocket);


    websocket.onopen = () => {
      console.log('Connected to WebSocket server')
      // console.log(websocket.readyState);
    };

    websocket.onclose = () => console.log('Disconnected from WebSocket server');

    websocket.onmessage = ((message) => {
      const { type, content } = JSON.parse(message.data)

      handleMessage(type, content)
      switch (type) {
        case "TestResponse":
          console.log("[Test response]", content);
          break
      }
    })

    // Cleanup on unmount
    return () => websocket.close();
  }, []);

  const test = (websocket: WebSocket) => {
    console.log("aaa");

    websocket.send(JSON.stringify({ type: "TEST", data: "testy" }))
  }

  function handleMessage(type: string, content: string) {
    console.log("add some stuff");
  }







  return (
    <div className='w-full h-full flex flex-row'>
      <div className="h-full w-1/2 flex flex-col  text-center">
        <p>Actions</p>
        {/* {ws != null ?
                <Actions websocket={ws} functions={[{ name: "test", action: ()=>test() }]}></Actions>
        :
        null} */}

        <button onClick={() => test(ws)}>aaa</button>
      </div>
      <div className="h-full w-1/2 flex flex-col  text-center">
        <p>Response box</p>
        <ResponseBox readFromParent={() => console.log("helo")}></ResponseBox>
      </div>
    </div>
  )
}

export default page
