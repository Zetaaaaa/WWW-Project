import React from 'react'
import Lobby from './Lobby'
import { io, Socket } from "socket.io-client";

function page() {

    // Initialize the Socket.IO connection
    // const socket = io('ws://localhost:1145');
        const socket = null
    return (
        <div>
            <Lobby socket={socket}></Lobby>
        </div>
    )
}

export default page
