'use client'
import React, { useEffect } from 'react'
import { Socket } from 'socket.io-client'

interface lobbyProps {
    socket: Socket
}

function Lobby({socket}:lobbyProps) {
    // useEffect(()=>{
    //     socket.emit('JOINED_LOBBY',JSON.stringify({lobbyName:"test"}))
    // },[])

  return (
    <div>
        <p>Game lobby</p>
    </div>
  )
}

export default Lobby
