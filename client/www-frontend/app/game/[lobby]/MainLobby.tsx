'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../../actions'; // Import your action
import { getSocket } from "../../lib/socket";
import { getUsername } from '../../actions';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

function MainLobby() {
    const socketRef = useRef<any | Socket>(null);
    const [lobbyName, setlobbyName] = useState(null);
    const [userName, setUsername] = useState<string>('user')
    const [playerList, setPlayerlist] = useState<string[] | null>(null)
   const router = useRouter();

    const params = useParams<{ tag: string; item: string }>()

    useEffect(() => {
        async function socketInit() {

            const token = await getToken();
            const { lobby } = await params
            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }

            //get username
            const username = await getUsername(token);
            const socket = getSocket(token.value);
            socketRef.current = socket
            setUsername(username)
            setlobbyName(lobby)


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
        <div className='w-full h-full flex flex-col items-center my-20 gap-10'>
            {lobbyName != null ?
                <h1>Current Lobby ID: {lobbyName}, UserName {userName}</h1>
                :
                null}

            <div>
                <Button onClick={() => {
                    console.log(playerList);

                    socketRef.current?.emit('TESTING');
                }}>test fetch</Button>
                <Button onClick={() => router.back()}>quit lobby</Button>
            </div>

            <div>
                {playerList != null ?
                    <>
                        <p>Users in the lobby</p>
                        {playerList?.map((player, index) => { return <p key={index}>---- {player}</p> })}
                    </>
                    : null}
            </div>
        </div>
    )
}

export default MainLobby