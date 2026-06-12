'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { ensureUuidCookie, getToken,getUsername } from '@/app/actions'; // Import your action
import { getSocket } from "@/app/lib/socket";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input';


function MainLobby() {
    
    // Game Logic here
 
    //
    
return (
    <p>Nic</p>
)
}

export default MainLobby

