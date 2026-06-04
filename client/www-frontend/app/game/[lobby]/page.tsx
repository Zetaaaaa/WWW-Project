'use client'
import React, { use, useEffect, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../../actions'; // Import your action
import { getSocket } from "../../lib/socket";
import { useRouter } from 'next/navigation'
import { getUsername } from '../../actions';
import { Button } from '@/components/ui/button';



function Lobby({ params }: { params: Promise<{ lobby: string }> }) {
    const [socket, setSocket] = useState<Socket | any>(null);
    const [lobbyName, setlobbyName] = useState(null);
    const router = useRouter()
    const [userName, setUsername] = useState<string>('user')



    useEffect(() => {
        async function socketInit() {
            const token = await getToken();

            console.log("token", token?.value);

            //get username
            const username = await getUsername(token)
            setUsername(username)


            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }
            const socket = getSocket(token.value);

            // Initialize the Socket.IO connection
            // const socket = io('ws://localhost:1145');

            // Socket.IO uses .on() for event listeners
            socket.on('connect', () => {
                console.log('Connected to Socket.IO server-LOBBY');
            });

            socket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
            });


            socket.on('errorResponse', (content) => {
                console.error("ERROR", content);
            });

            // Store in state so you can use it elsewhere in your component
            setSocket(socket);
            const { lobby } = await params
            console.log("LOBBY", lobby);
            setlobbyName(lobby)
            // Cleanup on unmount
            return () => {
                socket.disconnect();
            };

        }

        socketInit()
    }, []);


    return (
        <div>
            {lobbyName != null ?
                <h1>Current Lobby ID: {lobbyName}, UserName {userName}</h1>
                :
                null}

                <Button onClick={ ()=>{
                    socket.emit('TESTING')
                }}>test fetch</Button>

        </div>
    )
}

export default Lobby
