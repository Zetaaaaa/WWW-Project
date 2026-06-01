'use client'
// ES modules
import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface Lobby {
    name: string;
    variant: string;
    count: number;
    players: [];
}

interface mainProps {
    socketProp: Socket
}

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function Main() {

    const [socket, setSocket] = useState<Socket | any>(null);

    const [userName, setUsername] = useState<string>('user')
    const [lobbyName, setLobbyName] = useState<string | null>("Lobbyy")
    const [lobbyList, setLobbyList] = useState(null)

    
    useEffect(() => {
        // Initialize the Socket.IO connection
        const socket = io('ws://localhost:1145');

        // Socket.IO uses .on() for event listeners
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
        });

        // Listen for custom events sent from your server
        // Note: The server must be using socket.emit('event_name', data)
        socket.on('LOBBY_CREATED', (data) => {
            console.log("lobby is up!!!", data);
        });

        socket.on('LOBBY_LIST', (lobbyData) => {
            // console.log("GOT NEW LOBBY LIST:", lobbyData);
            setLobbyList(lobbyData);
        });

        socket.on('errorResponse', (content) => {
            console.error("ERROR", content);
        });

        // Store in state so you can use it elsewhere in your component
        setSocket(socket);

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, []);
    function createLobby(lobbyName: string) {
        console.log("Attempting creation of a new lobby");

        // Socket.IO automatically handles serialization
        socket.emit("CREATE_LOBBY", {
            lobbyName: lobbyName,
            userName: userName
        });
    }

    function joinLobby(lobbyName: string) {
        console.log("Attempting to join a lobby");

        // Send the object directly
        socket.emit("JOIN_LOBBY", {
            lobbyName: lobbyName,
            userName: userName
        });
    }
    return (
        // grid-cols-2
        <div className="w-full h-full flex flex-col gap-1">

            <div className="light:text-black flex-1/1 text-center dark:text-sky-100">
                <p>Actions</p>
                <div className="flex mt-3 flex-col row-span-2 col-span-2  items-center gap-5">
                    {/* <Button onClick={() => test(ws)} variant={"outline"}>Test Request</Button> */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Create Lobby</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Create Lobby</DialogTitle>
                                <DialogDescription>
                                    Create a game lobby to play with your friends!
                                </DialogDescription>
                            </DialogHeader>
                            <FieldGroup>
                                <Field>
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" name="username" placeholder="The biggest liar" defaultValue={"user"} onInput={(e) => { setUsername(e.currentTarget.value) }} />
                                </Field>
                                <Field>
                                    <Label htmlFor="lobbyname">Lobby Name</Label>
                                    <Input id="lobbyname" type="text" placeholder="Liar's table" defaultValue={"1"} maxLength={20} minLength={2} onInput={(e) => { setLobbyName(e.currentTarget.value) }} />
                                </Field>
                            </FieldGroup>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button onClick={() => createLobby(lobbyName)} type="submit">Create</Button>
                            </DialogFooter>

                        </DialogContent>
                    </Dialog>
                    <Button onClick={() => console.log("im a dud")} variant={"outline"}>Settings</Button>
                </div>
            </div>
            {/* <div className="bg-blue-400 row-span-4">
                <p>ResponseBox</p>
            </div> */}
            {/* <p className="text-black text-lg font-semibold">Table</p> */}
            {/* albo to https://reactbits.dev/components/animated-list */}
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="h-full w-4/5">
                    <Table className="w-full">
                        <TableCaption>Online lobbies: {lobbyList != null ? lobbyList.length : "00a"}</TableCaption>
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

                            {lobbyList != null &&
                                lobbyList.map(([id, lobby]: [string, Lobby]) => {
                                    return (
                                        <TableRow key={id}>
                                            <TableCell>{id + 1}.</TableCell>
                                            <TableCell>{lobby.name}</TableCell>
                                            <TableCell>{lobby.variant}</TableCell>
                                            <TableCell>1/{lobby.count}</TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button>Join</Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-sm">
                                                        <DialogHeader>
                                                            <DialogTitle>Join the game : {lobby.name}</DialogTitle>
                                                            <DialogDescription>
                                                                Type your username and join the game!
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <FieldGroup>
                                                            <Field>
                                                                <Label htmlFor="username">Username</Label>
                                                                <Input id="username" name="username" placeholder="The biggest liar" defaultValue={"user"} onInput={(e) => { setUsername(e.currentTarget.value) }} />
                                                            </Field>
                                                        </FieldGroup>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button variant="outline">Cancel</Button>
                                                            </DialogClose>
                                                            {/* SUBJECT TO CHANGE DUE TO THE NATURE OF NAMES  ->> CODE JHD12S */}
                                                            <Button onClick={() => joinLobby(lobby.name)} type="submit">Join</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            }
                        </TableBody>
                    </Table>
                </div>

            </div>
        </div>
    )
}

export default Main
