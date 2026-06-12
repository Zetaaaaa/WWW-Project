'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../../actions'; // Import your action
import { getSocket } from "../../lib/socket";
import { getUsername } from '../../actions';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'
import InitialLobbyWrapper from './InitialLobbyWrapper';


function Lobby({ params }: { params: Promise<{ lobby: string }> }) {
    const socketRef = useRef<any | Socket>(null);
  
    const [userName, setUsername] = useState<string>('user')
    const [playerList, setPlayerlist] = useState<string[] | null>(null)
    const router = useRouter();

    useEffect(() => {

        async function socketInit() {
            const { lobby } = await params
            const token = await getToken();

            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }

            //get username
            const username = await getUsername(token);
            const socket = getSocket(token.value);
            socketRef.current = socket
            setUsername(username)
        


            // Socket.IO uses .on() for event listeners
            socketRef.current.on('connect', () => {
                // console.log("socket connections");
                socketRef.current.emit("ROOM_HELLO", { data: lobby });
            });

            socketRef.current.off("LOBBY_LIST")

            socketRef.current.on('disconnect', () => {
                console.log('Disconnected from Socket.IO server');
            });

            socketRef.current.on("ROOM_REFRESH", ({ playerList }
            ) => {
                setPlayerlist(playerList)
            })


            socketRef.current.on('errorResponse', (content) => {
                console.error("ERROR", content);
            });

            socketRef.current.emit("ROOM_HELLO", { data: lobby });


            // // console.log("LOBBY", lobby);


            const handlePopState = () => {
                socketRef.current.emit("LEFT_LOBBY", ({ username, lobby }))
            };
            window.addEventListener('popstate', handlePopState);
            // Cleanup on unmount
            return () => {
                socket.disconnect();
            };
        }
        socketInit()






    }, []);




    return (
        <div>
            <InitialLobbyWrapper></InitialLobbyWrapper>
        </div>
    )
}

export default Lobby
