/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useEffect, useState } from "react";
import Actions from "./Components/Actions";
import ResponseBox from "./Components/ResponseBox"
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Navbar from "./Components/navbar";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function page() {

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [ws, setWs] = useState<WebSocket | any>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [userName,setUsername] = useState<string>('user')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [lobbyName, setLobbyName] = useState<string|null>(null)

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

        case "errorResponse":
          throw new Error("ERROR" + content)

        case "success":
          console.log("Success!");
          break;
      }
    })
    // Cleanup on unmount
    return () => websocket.close();
  }, []);

  const test = (websocket: WebSocket) => {
    console.log("Sending Test request");
    websocket.send(JSON.stringify({ type: "TEST", data: "testy" }))
  }

  function handleMessage(type: string, content: string) {
    console.log("add some stuff");
  }

  function sendMessage(action: string) {
    switch (action) {
      case "CREATE_LOBBY":
        console.log("Attempting creation of a new lobby");
        ws.send(JSON.stringify({ type: action, data: "sample", lobbyName:lobbyName,username:userName}))
        break;
      case "JOIN_LOBBY":
        console.log("Attempting to join a lobby");
        ws.send(JSON.stringify({ type: action }))
        break;
    }
    console.log(action)
  }

  function joinLobby() {
    console.log("PPP");

  }

  return (
    <div className="w-full h-full">
      <Navbar></Navbar>
      <div className="w-full h-full grid grid-cols-2 gap-1">

        <div className="light:text-black text-center dark:text-sky-100">
          <p>Actions</p>

          <div className="flex mt-3 flex-col items-center gap-5">
            <Button onClick={() => test(ws)} variant={"outline"}>Test Request</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Create Lobby</Button>
              </PopoverTrigger>
              <PopoverContent>
                <PopoverHeader>
                  <PopoverTitle>Create Lobby</PopoverTitle>
                  <PopoverDescription>Username is required.</PopoverDescription>
                  <Field className="p-2 gap-5" orientation="horizontal">
                    <Input type="text" placeholder="Lobby Name" maxLength={20} onInput={(e)=>{setLobbyName(e.currentTarget.value)}} />
                  </Field>
                  <Button onClick={() => sendMessage("CREATE_LOBBY")} variant={"outline"}>Create lobby</Button>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
            <Button onClick={() => sendMessage("JOIN_LOBBY")} variant={"outline"}>Join Lobby</Button>
          </div>
        </div>
        <div className="bg-blue-400 row-span-4">
          <p>ResponseBox</p>
        </div>
        {/* <p className="text-black text-lg font-semibold">Table</p> */}
        {/* albo to https://reactbits.dev/components/animated-list */}
        <Table>
          <TableCaption>Online lobbies: 00</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>__</TableHead>
              <TableHead>Lobby Name</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>People Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>1.</TableCell>
              <TableCell>TestLobby</TableCell>
              <TableCell>Normal</TableCell>
              <TableCell>1/5</TableCell>
              <TableCell>
                <Button onClick={() => joinLobby()}>Join</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

  )
}

export default page
