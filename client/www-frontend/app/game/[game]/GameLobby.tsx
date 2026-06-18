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
    const socketRef = useRef<any | Socket>(null);
    const [socket, setSocket] = useState(null)
    const [username, setUsername] = useState('default')
    const [gameData, setGameData] = useState<any>(null);
    const [game, setGame] = useState<string | null>(null)

    const params = useParams<{ game: string }>()

    // Game Logic here
    useEffect(()=>{
        async function init() {
            const token = await getToken();
            // const uuid = await ensureUuidCookie()

            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }
            const { game } = params;
            setGame(game)
            //get username
            const username = await getUsername(token);
            setUsername(username)
            const socket = getSocket(token.value);
            socketRef.current = socket
            setSocket(socketRef.current)
            //setUsername(username)
            //setlobbyName(lobby)
            socketRef.current.on("GAME_DATA",(response)=>{
                console.log(response.data);
                setGameData(response.data);
            })
            console.log("getgamedata:", game);
            socketRef.current.emit("GET_GAME_DATA",game)
        }
        init()
    },[])

    const handleFetchData = async () => {
        const { game } = await params;
        console.log("getgamedata:", game);
        socketRef.current.emit("GET_GAME_DATA", game);
    };

    
return (
    <>
        <p>Rendering Game... and you are {username}</p>
    <Button onClick={handleFetchData}>testing</Button>
    {gameData && (
                <div className="mt-4 p-4 bg-slate-800 text-white rounded">
                    <pre className="text-xs">{JSON.stringify(gameData, null, 2)}</pre>
                </div>
    )}
    </>

)
}

export default MainLobby

