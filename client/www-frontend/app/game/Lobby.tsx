'use client'
import React, { useEffect, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../actions'; // Import your action





function Lobby() {
    const [socket, setSocket] = useState<Socket | any>(null);

  useEffect(() => {

        async function socketInit() {
            const token = await getToken();
            console.log(token?.value);

            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }
            const socket = io('ws://localhost:1145',{
                auth:{
                    token:token.value
                }
            });

            // Initialize the Socket.IO connection
        // const socket = io('ws://localhost:1145');

        // Socket.IO uses .on() for event listeners
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
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

        }

        socketInit()
    }, []);
    

  return (
    <div>
        <p>Game lobby</p>
    </div>
  )
}

export default Lobby
