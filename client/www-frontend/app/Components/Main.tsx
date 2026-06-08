'use client'
// ES modules
import { useRouter } from 'next/navigation'
import { Socket } from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getToken } from '../actions'; // Import your action

interface Lobby {
    name: string;
    variant: string;
    count: number;
    players: [];
}

interface MainProps {
    userName: string;
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
import { getSocket } from "../lib/socket";




function Main( {userName}:MainProps) {

    const [lobbyName, setLobbyName] = useState<string | null>("Lobby")
    const [lobbyList, setLobbyList] = useState(null)
    const socketRef = useRef<any>(null);
    const router = useRouter()

    function joinLobby(lobbyName: string) {
        // 2. Access the socket via .current
        if (!socketRef.current) return;

        console.log("Attempting to join:", lobbyName);
        socketRef.current.emit("JOIN_LOBBY", {
            userName: userName,
            lobbyName: lobbyName,
        });
    }

    function createLobby(lobbyName: string) {
        if (!socketRef.current) return;

        console.log("Attempting creation of a new lobby");
        socketRef.current.emit("CREATE_LOBBY", {
            lobbyName: lobbyName,
        });
    }

    useEffect(() => {
        async function init() {
            const token = await getToken();
            if (!token) return;

            // This will now always return the same connection
            const socket = getSocket(token.value);
            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("Connected with ID:", socket.id);
            });

            socket.on('disconnect', () => {
                socket.emit("DISCONNECT")
                console.log('Disconnected from Socket.IO server');
            });

            // Listen for custom events sent from your server
            // Note: The server must be using socket.emit('event_name', data)
            socket.on('LOBBY_CREATED', (data) => {
                console.log("LOBBY_CREATED received:", data);

                // Defensive check
                if (!data || !data.lobby) {
                    console.error("Error: Server did not return a valid lobby object.");
                    return;
                }

                const name = data.lobby.name || data.lobby; // Fallback if structure varies
                console.log("Attempting to join:", name);

                joinLobby(name);
            });

            socket.on('LOBBY_LIST', (lobbyData) => {
                console.log("GOT NEW LOBBY LIST:", lobbyData);
                setLobbyList(lobbyData);
            });

            socket.on('JOINED_LOBBY', (data) => {
                console.log("JOINED LOBBY", data);
                router.push("game/" + data)

            })

            socket.on('errorResponse', (content) => {
                console.error("ERROR", content);
            });

            // Store in state so you can use it elsewhere in your component
            // setSocket(socket);

            // Cleanup on unmount
            return () => {
                socket.disconnect();
            };
        }
        init();
    }, []);


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
                                    <Label htmlFor="lobbyname">Lobby Name</Label>
                                    <Input id="lobbyname" type="text" placeholder="Liar's table" defaultValue={lobbyName} maxLength={20} minLength={2} onInput={(e) => { setLobbyName(e.currentTarget.value) }} />
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
                                            <TableCell>{lobby.name}</TableCell>
                                            <TableCell>{lobby.variant}</TableCell>
                                            <TableCell>1/{lobby.count}</TableCell>
                                            <TableCell>
                                                {/* SUBJECT TO CHANGE DUE TO THE NATURE OF NAMES  ->> CODE JHD12S */}
                                                <Button onClick={() => joinLobby(lobby.name)} type="submit">Join</Button>
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