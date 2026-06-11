'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken } from '../../actions'; // Import your action
import { getSocket } from "../../lib/socket";
import { getUsername } from '../../actions';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input';

function MainLobby() {
    const socketRef = useRef<any | Socket>(null);
    const [lobbyName, setlobbyName] = useState(null);
    const [userName, setUsername] = useState<string>('user')
    const [playerList, setPlayerlist] = useState<string[] | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [lobby, setLobby]= useState<string | null>(null)
    const [socket, setSocket] = useState(null)
    const router = useRouter();

    const params = useParams<{ tag: string; item: string }>()

    useEffect(() => {
        async function socketInit() {

            const token = await getToken();
            const { lobby } = await params
            if (!token) {
                throw new Error("FAILED IN ESTABLISHING CONNECTION")
            }
            setLobby(lobby)
            //get username
            const username = await getUsername(token);
            const socket = getSocket(token.value);
            socketRef.current = socket
            setSocket(socketRef.current)
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

            socketRef.current.on("NOT_FOUND", () => {
                router.replace("/404")
            })

            socketRef.current.on('errorResponse', (content) => {
                console.error("ERROR", content);
            });
             socketRef.current.on('LOBBYMSG', (content) => {
                console.log("NEW MESSAGE",content);
            });

            socketRef.current.emit("ROOM_HELLO", { data: lobby });

            const handlePopState = () => {
                console.log(lobby);
                socketRef.current.emit("LEFT_LOBBY", ({ username, lobby }))
            };
            window.addEventListener('popstate', handlePopState);
            // Cleanup on unmount
            return () => {
                socketRef.current.disconnect();
            };



        }
        socketInit()
    }, []);

    function sendMessage() {
        if (message) {
            socket?.emit("LOBBYMSG",{message, lobby})
        }
    }



    return (
        <div className="w-full max-w-2xl mx-auto py-10 px-4">
            {/* Lobby Header */}
            <div className="text-center mb-10">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {lobbyName || "Lobby Loading..."}
                </h1>
                <p className="text-slate-500 mt-2">Connected as: <span className="font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">{userName}</span></p>
            </div>

            {/* Player Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Active Players</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {playerList?.map((player, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-xs">
                                {player[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{player}</span>
                        </div>
                    ))}
                </div>

                <div className='mt-5 w-full h-96 dark:bg-slate-500 border-2 dark:border-slate-400 rounded-md flex flex-col justify-between p-4'>
                    {/* Other content here will stay at the top */}
                    <div className='top-content'>
                        <p>Other content stays here</p>
                    </div>

                    {/* This will be pushed to the bottom */}
                    <div className=' bg-violet-400 border-t rounded-lg border-slate-700'>
                        <div className="relative flex items-center w-full">
                            {/* The Input */}
                            <Input
                                onInput={(e) => { setMessage(e.currentTarget.value) }}
                                className="w-full bg-gray-800 shadow-inner py-1.5 pr-16 pl-3 text-base text-white placeholder:text-gray-500 focus:outline-none" />

                            {/* The Button - Positioned absolutely inside the input area */}
                            <Button onClick={() => sendMessage()} className="absolute right-0 text-bold text-black">
                                +
                            </Button>
                        </div>
                    </div>
                </div>



            </div>

            {/* Footer Controls */}
            <div className="flex justify-center gap-4 mt-10">
                <Button onClick={() => { startGame() }}>Start game</Button>
                <Button variant="outline" onClick={() => socketRef.current?.emit('TESTING')}>
                    Refresh Status
                </Button>
                <Button variant="destructive" onClick={() => router.back()}>
                    Leave Lobby
                </Button>
            </div>
        </div>
    )
}

export default MainLobby