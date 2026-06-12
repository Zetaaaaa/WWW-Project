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
    const [lobbyName, setlobbyName] = useState(null);
    const [userName, setUsername] = useState<string>('user')
    const [playerList, setPlayerlist] = useState<string[] | null>(null)
    const [message, setMessage] = useState<string>(""); const [chatHistory, setChatHistory] = useState<{ message: string, username: string }[]>([]);
    const [lobby, setLobby] = useState<string | null>(null)
    const [socket, setSocket] = useState(null)
    const [uuid, setUuid] = useState(null)
    const router = useRouter();

    const params = useParams<{ tag: string; item: string }>()

    const initialized = useRef(false);

    useEffect(() => {
        // Prevent double-initialization
        if (initialized.current) return;
        initialized.current = true;

        async function socketInit() {
            const token = await getToken();
            const uuid = await ensureUuidCookie()
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
            setUuid(uuid)

            // Attach listeners ONCE
            socket.on("connect", () => socket.emit("ROOM_HELLO", { data: lobby }));
            socket.on("ROOM_REFRESH", ({ playerList }) => {
                console.log("Aaaa");
                console.log(playerList);
                
                setPlayerlist(playerList)
            })

        socket.on("LOBBYMSG", ({ message, username }) => {
            setChatHistory((prev) => [...prev, { message, username }]);
        });
        socket.on("GAME_STARTED", () => router.push(`/game/${lobby}`));

        // Initial trigger
        socket.emit("ROOM_HELLO", { data: lobby });

        const onGameStarted = () => {
            // Force the client to navigate to the game route
            router.push(`/game/${lobby}`);
        };

        socket.on("GAME_STARTED", onGameStarted);
    }

        socketInit();

    // Cleanup: Only disconnect if you are sure no other components need this socket
    return () => {
        // If you move to the SocketProvider (recommended), 
        // you should NOT disconnect here.
    };
}, []); // Empty dependency array means it runs once on mount

function sendMessage() {
    if (message) {
        socketRef.current?.emit("LOBBYMSG", { message, lobby, userName })
    }
}

function startGame() {
    if (socketRef.current) {
        // Emit the event to the server
        socketRef.current.emit("START_GAME", { lobby,uuid });
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
            <Button
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
                Copy Invite Link
            </Button>
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

            <div className='mt-5 w-full h-83 dark:bg-slate-500 border-2 dark:border-slate-400 rounded-md flex flex-col justify-between p-4'>
                {/* Other content here will stay at the top */}
                <div className='top-content'>
                    <div className="flex flex-col gap-2 p-4 h-64 overflow-y-auto">
                        {chatHistory.map((msg, index) => (
                            <div key={index} className="bg-gray-700 text-white p-2 rounded">
                                {msg.username} : {msg.message}
                            </div>
                        ))}
                    </div>
                </div>

                {/* This will be pushed to the bottom */}
                <div className='bg-violet-400 border-t rounded-lg border-slate-700'>
                    <div className="relative flex items-center w-full">
                        <Input
                            value={message} // Controlled component
                            onInput={(e) => { setMessage(e.currentTarget.value) }}
                            className="w-full bg-gray-800 ... " />
                        <Button onClick={() => {
                            sendMessage();
                            setMessage(""); // Clear input after sending
                        }} className="...">
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