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


function Main({ userName }: MainProps) {

    const [lobbyName, setLobbyName] = useState<string | null>("Lobby")
    const [lobbyList, setLobbyList] = useState(null)
    const socketRef = useRef<any>(null);
    const router = useRouter();


    function joinLobby(lobbyName: string) {
        // 2. Access the socket via .current
        if (!socketRef.current) return;

        // console.log("Attempting to join:", lobbyName);
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

    const handleLobbyCreated = (data) => {
        console.log("LOBBY_CREATED received:", data);
        if (!data || !data.lobby) {
            console.error("Error: Server did not return a valid lobby object.");
            return;
        }
        const name = data.lobby.name || data.lobby;
        // console.log("Attempting to join:", name);
        joinLobby(name); // Upewnij się, że ta funkcja jest dostępna w zasięgu
    };

    const handleLobbyList = (lobbyData) => {
        // console.log("GOT NEW LOBBY LIST:", lobbyData);
        setLobbyList(lobbyData);
    };

    const handleJoinedLobby = (data) => {
        console.log("JOINED LOBBY", data);
        router.push("game/" + data);
    };

    const handleErrorResponse = (content) => {
        console.error("ERROR", content);
    };


    useEffect(() => {
        let isMounted = true; // Cleanup flag

        async function init() {
            const token = await getToken();
            if (!token || !isMounted) return; // Stop if component unmounted

            const socket = getSocket(token.value);
            socketRef.current = socket;

             if (socket.connected) {
                console.log("Already connected! Re-using session:", socket.id);
                // Trigger logic for when you just "go back" to the page
                socket.emit("GO_BACK");
            } else {
                console.log("Fresh connection being established...");
                // socket.connect(); // Explicitly connect if it was offline ---- DANGEROUS!!!!!!!!!!!!!!!!!
            }

            socket.on("connect", () => {
                console.log("Connected with ID:", socket.id);
            });

            socket.on('disconnect', () => {
                // socket.emit("DISCONNECT")
                console.log('Disconnected from Socket.IO server');
            });

            // Ensure we don't attach multiple times if init is called twice
            // Remove existing listeners before adding new ones
            socketRef.current.off('LOBBY_CREATED');
            socketRef.current.off('LOBBY_LIST');
            socketRef.current.off('JOINED_LOBBY');
            socketRef.current.off('errorResponse');


            socketRef.current.on('LOBBY_CREATED', handleLobbyCreated);
            socketRef.current.on('LOBBY_LIST', handleLobbyList);
            socketRef.current.on('JOINED_LOBBY', handleJoinedLobby);
            socketRef.current.on('errorResponse', handleErrorResponse);
        }

        init();

        return () => {
            isMounted = false;
            // Use optional chaining (?.) so it doesn't crash if current is null
            socketRef.current?.off('LOBBY_CREATED', handleLobbyCreated);
            socketRef.current?.off('LOBBY_LIST', handleLobbyList);
            socketRef.current?.off('JOINED_LOBBY', handleJoinedLobby);
            socketRef.current?.off('errorResponse', handleErrorResponse);
        };
    }, []); // Keep dependency array empty



    return (
       <div className="w-full h-full p-6 flex flex-col gap-8 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
    
    {/* Header & Actions Area */}
    <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Game Lobbies</h2>
            <p className="text-sm text-slate-500">Jump into a game or host your own.</p>
        </div>
        
        <div className="flex gap-3">
            <Button variant="ghost" onClick={() => console.log("Settings")}>Settings</Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="bg-sky-600 hover:bg-sky-700">Create Lobby</Button>
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
        </div>
    </div>

    {/* Table Area */}
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Table>
            <TableHeader className="bg-slate-100 dark:bg-slate-800">
                <TableRow>
                    <TableHead>Lobby Name</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {lobbyList?.length > 0 ? (
                    lobbyList.map(([id, lobby]) => (
                        <TableRow key={id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium">{lobby.name}</TableCell>
                            <TableCell>{lobby.variant}</TableCell>
                            <TableCell>
                                <span className="inline-flex dark items-center px-2 py-1 rounded-full bg-slate-600 text-xs font-medium">
                                    1 / {lobby.count}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => joinLobby(lobby.name)}>Join</Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                            No active lobbies found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
</div>
    )
}

export default Main