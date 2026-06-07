'use client'
import React, { use, useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../../actions'; // Import your action
import { getSocket } from "../../lib/socket";
import { useRouter } from 'next/navigation'
import { getUsername } from '../../actions';
import { Button } from '@/components/ui/button';



function Lobby({ params }: { params: Promise<{ lobby: string }> }) {
    const socketRef = useRef<any | Socket>(null);
    const [socket, setSocket] = useState<Socket | any>(null);
    const [lobbyName, setlobbyName] = useState(null);
    const router = useRouter()
    const [userName, setUsername] = useState<string>('user')



    useEffect(() => {
        async function socketInit() {
            const token = await getToken();

            // console.log("token", token?.value);

            //get username
            const username = await getUsername(token)
            setUsername(username)


            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }
            const socket = getSocket(token.value);
            socketRef.current = socket

            // Socket.IO uses .on() for event listeners
            socket.on('connect', () => {
                console.log('Connected to Lobby');


            });

            socket.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
            });

            socket.on("ROOM_REFRESH", () => {
                console.log("new player joined");
            })


            socket.on('errorResponse', (content) => {
                console.error("ERROR", content);
            });
            const { lobby } = await params
            socketRef.current.emit("ROOM_HELLO", { data: lobby });


            // // console.log("LOBBY", lobby);
            setlobbyName(lobby)
            // Cleanup on unmount
            return () => {
                socket.disconnect();
            };

        }

        socketInit()
    }, []);


    return (
        <div className='w-full h-full flex flex-col items-center my-20 gap-10'>
            {lobbyName != null ?
                <h1>Current Lobby ID: {lobbyName}, UserName {userName}</h1>
                :
                null}

            <div>
                <Button onClick={() => {
                    socketRef.current?.emit('TESTING');
                }}>test fetch</Button>
            </div>



            <div>
                <p>Users in the lobby</p>
            </div>


        </div>
    )
}

export default Lobby
