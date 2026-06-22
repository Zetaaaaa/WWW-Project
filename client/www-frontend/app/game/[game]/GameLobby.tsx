'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from "socket.io-client";
import { getToken, getUsername } from '@/app/actions'; 
import { getSocket } from "@/app/lib/socket";
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation'

export default function MainLobby() {
    const socketRef = useRef<any | Socket>(null);
    const [username, setUsername] = useState('default');
    const [gameData, setGameData] = useState<any>(null);
    const [myRole, setMyRole] = useState<string>('');
    const [myUuid, setMyUuid] = useState<string>('');
    const params = useParams<{ game: string }>();

    // Nowe stany lokalne
    const [raiseAmount, setRaiseAmount] = useState<string>('');
    const [selectedCardsToDiscard, setSelectedCardsToDiscard] = useState<number[]>([]);

    useEffect(() => {
        async function init() {
            const token = await getToken();
            if (!token) throw new Error("FAILED IN ESTABLISHING CONNECTION");
            
            const fetchedUsername = await getUsername(token);
            setUsername(fetchedUsername);
            
            const s = getSocket(token.value);
            socketRef.current = s;

            s.on("GAME_DATA", (response) => {
                setGameData(response.data);
                setMyRole(response.myRole);
                setMyUuid(response.myUuid);
                // Reset zaznaczonych kart przy zmianie fazy
                if(response.data.phase !== 'EXCHANGE') setSelectedCardsToDiscard([]);
            });

            s.on("REFRESH_GAME_DATA", () => {
                s.emit("GET_GAME_DATA", params.game);
            });

            s.emit("GET_GAME_DATA", params.game);
        }
        init();
    }, [params.game]);

    const sendAction = (action: string, payload: any = {}) => {
        socketRef.current.emit("GAME_ACTION", {
            lobby: params.game,
            action,
            payload
        });
    };

    const toggleCardDiscard = (index: number) => {
        setSelectedCardsToDiscard(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    if (!gameData) return <p>Ładowanie gry...</p>;

    const isDealer = myRole === 'DEALER';
    const isMyTurn = gameData.activePlayerUuid === myUuid;
    const me = gameData.players.find((p: any) => p.uuid === myUuid);
    const playingPlayers = gameData.players.filter((p: any) => p.role !== 'DEALER');
    
    const amountToCall = me ? Math.max(0, gameData.currentHighestBet - me.currentBet) : 0;

    return (
        <div className="p-4 flex flex-col gap-4">
            <header className="flex justify-between bg-slate-900 text-white p-4 rounded shadow-md">
                <div>
                    <h1 className="text-xl font-bold">Poker Game <span className="text-sm font-normal ml-2 text-gray-400">(Runda {gameData.round || 1})</span></h1>
                    <p>Faza: <span className="text-blue-400 font-semibold">{gameData.phase}</span></p>
                    <p>Pula: <span className="text-green-400 font-bold">${gameData.pot}</span></p>
                </div>
                {/* ... reszta headera bez zmian ... */}
            </header>
            {/* --- WIDOK DEALERA PODCZAS ROZDAWANIA --- */}
            {isDealer && (gameData.phase === 'DEALING' || gameData.phase === 'DEALING_2') && (
                <div className="bg-slate-800 p-4 rounded text-white border border-blue-500 shadow-lg">
                    <h2 className="text-lg mb-2 font-bold text-blue-300">Panel Dealera (Rozdawanie)</h2>
                    <div className="mb-4">
                        <p className="text-sm text-slate-400">Karty na szczycie talii:</p>
                        <div className="flex gap-2 text-black mt-2">
                            {gameData.topCards.map((c: string, idx: number) => (
                                <div key={idx} className="bg-white p-2 rounded font-bold w-12 text-center shadow">{c}</div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {playingPlayers.map((p: any) => (
                            <Button 
                                key={p.uuid} 
                                disabled={p.cardCount >= 5 || p.folded}
                                onClick={() => sendAction('DEAL_CARD', { targetUuid: p.uuid })}
                                className={p.cardCount < 5 && !p.folded ? 'bg-blue-600 hover:bg-blue-500 text-white' : ''}
                            >
                                Daj kartę ({p.username}: {p.cardCount}/5)
                            </Button>
                        ))}
                    </div>
                </div>
            )}
            {/* --- WIDOK STOŁU I GRACZY --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playingPlayers.map((p: any) => (
                    <div key={p.uuid} className={`p-4 rounded border relative ${p.eliminated ? 'bg-gray-800 opacity-50 border-red-900' : 'bg-slate-50 border-slate-300'} ${p.uuid === gameData.activePlayerUuid && (gameData.phase === 'BETTING_1' || gameData.phase === 'BETTING_2') && !p.eliminated ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] bg-yellow-50' : ''}`}>
                        {p.eliminated && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-2xl rotate-12 z-10">WYELIMINOWANY</div>}
                        <h3 className="font-bold flex justify-between items-center text-slate-800">
                            <span className={p.eliminated ? 'text-gray-400' : ''}>
                                {p.username} {p.uuid === myUuid ? '(Ty)' : ''}
                                {isDealer && p.role === 'ACCOMPLICE' && <span className="text-xs ml-2 text-purple-600 bg-purple-100 px-2 py-1 rounded border border-purple-300">Wspólnik</span>}
                            </span>
                            <span className={p.folded || p.eliminated ? 'text-red-500 font-bold' : 'text-green-700 font-bold'}>
                                {p.eliminated ? 'Kicked' : (p.folded ? 'Fold' : `$${p.money}`)}
                            </span>
                        </h3>
                        {!p.eliminated && (
                            <>
                                <p className="text-sm text-slate-500">Obecny bet: <span className="font-semibold">${p.currentBet}</span></p>
                                <div className="flex gap-2 mt-3 min-h-[40px]">
                                    {p.folded ? (
                                        <p className="text-sm text-red-500 italic mt-2">Spasował (Karty ukryte)</p>
                                    ) : p.cardCount === '?' ? (
                                        <p className="text-sm text-slate-500 italic mt-2 animate-pulse">Trwa rozdawanie kart...</p>
                                    ) : p.hand.length > 0 ? (
                                        p.hand.map((card: string, i: number) => (
                                            <div key={i} className="bg-white text-black p-2 rounded shadow border border-slate-300 font-bold text-center w-11">
                                                {card}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-400 italic mt-2">Karty ukryte ({p.cardCount}/5)</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* --- PANEL AKCJI GRACZA --- */}
            {!isDealer && !me?.folded && !me?.eliminated && gameData.phase !== 'VOTING' && (
                <div className="mt-4 bg-slate-800 text-white p-5 rounded-lg shadow-lg border border-slate-600">
                    <h3 className="font-bold mb-4 text-slate-200 text-lg border-b border-slate-600 pb-2">Twoje akcje</h3>
                    
                    {/* Fazy Licytacji */}
                    {(gameData.phase === 'BETTING_1' || gameData.phase === 'BETTING_2') && isMyTurn ? (
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-3 items-center">
                                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={() => sendAction('BET', { type: 'CHECK_CALL', amount: amountToCall })}>
                                    {amountToCall > 0 ? (amountToCall >= me.money ? 'All-In Call' : `Call ($${amountToCall})`) : 'Check'}
                                </Button>
                                <Button variant="destructive" className="font-bold" onClick={() => sendAction('BET', { type: 'FOLD', amount: 0 })}>
                                    Fold
                                </Button>
                            </div>
                            <div className="flex gap-3 items-center border-t border-slate-600 pt-4">
                                <span className="text-sm font-semibold text-slate-300">Podbij o:</span>
                                <input 
                                    type="number" 
                                    className="border border-slate-500 bg-slate-700 text-white rounded px-3 py-1.5 w-28 focus:outline-none focus:border-blue-400" 
                                    placeholder="Kwota"
                                    value={raiseAmount}
                                    onChange={(e) => setRaiseAmount(e.target.value)}
                                    min={0}
                                    max={me.money - amountToCall}
                                />
                                <Button 
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold"
                                    disabled={!raiseAmount || Number(raiseAmount) <= 0 || Number(raiseAmount) > (me.money - amountToCall)}
                                    onClick={() => {
                                        sendAction('BET', { type: 'RAISE', amount: amountToCall + Number(raiseAmount) });
                                        setRaiseAmount('');
                                    }}
                                >
                                    Raise
                                </Button>
                            </div>
                        </div>
                    ) : (gameData.phase === 'BETTING_1' || gameData.phase === 'BETTING_2') ? (
                        <p className="text-slate-400 italic">Czekaj na swoją kolej...</p>
                    ) : null}

                    {/* Faza Wymiany */}
                    {gameData.phase === 'EXCHANGE' && (
                        <div className="flex flex-col gap-4">
                            {me.hasSkippedExchange ? (
                                <p className="text-slate-400 italic">Oczekiwanie na innych graczy...</p>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-300">Kliknij na karty, które chcesz odrzucić:</p>
                                    <div className="flex gap-2">
                                        {me.hand?.map((card: string, i: number) => {
                                            const isSelected = selectedCardsToDiscard.includes(i);
                                            return (
                                                <div 
                                                    key={i} 
                                                    onClick={() => toggleCardDiscard(i)}
                                                    className={`cursor-pointer p-2 rounded shadow font-bold text-center w-12 border-2 transition-all duration-200
                                                        ${isSelected ? 'bg-red-500 border-red-300 text-white -translate-y-2 scale-105' : 'bg-white text-black border-transparent hover:bg-slate-200'}`}
                                                >
                                                    {card}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <Button 
                                        className="w-fit mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                                        onClick={() => sendAction('EXCHANGE_CARDS', { uuid: myUuid, cardsToRemove: selectedCardsToDiscard })}
                                    >
                                        Zatwierdź odrzucenie ({selectedCardsToDiscard.length} kart)
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Informacja w trakcie rozdawania dla Gracza */}
                    {(gameData.phase === 'DEALING' || gameData.phase === 'DEALING_2') && (
                        <p className="text-slate-400 italic">Trwa rozdawanie kart przez dealera...</p>
                    )}
                </div>
            )}

            {/* --- PANEL GŁOSOWANIA (Widoczny także dla osób, które zrobiły FOLD) --- */}
            {!isDealer && !me?.eliminated && gameData.phase === 'VOTING' && (
                <div className="mt-4 bg-slate-800 text-white p-5 rounded-lg shadow-lg border border-red-500">
                    <h3 className="font-bold mb-4 text-red-400 text-lg border-b border-slate-600 pb-2">Faza Głosowania</h3>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-slate-300 font-bold">Wybierz kogo chcesz wyrzucić ze stołu (wymagane 2 głosy):</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Button 
                                className="bg-gray-600 hover:bg-gray-500 text-white"
                                onClick={() => sendAction('CAST_VOTE', { voterUuid: myUuid, targetUuid: 'PASS' })}
                            >
                                Pass (Nie głosuj)
                            </Button>
                            {/* Celowo usuwamy Dealera z listy do głosowania */}
                            {playingPlayers.filter((p: any) => p.uuid !== myUuid && !p.eliminated && p.uuid !== gameData.hostUuid).map((p: any) => (
                                <Button 
                                    key={p.uuid}
                                    className="bg-red-700 hover:bg-red-600 text-white font-bold"
                                    onClick={() => sendAction('CAST_VOTE', { voterUuid: myUuid, targetUuid: p.uuid })}
                                >
                                    Głosuj na {p.username}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- EKRAN KOŃCOWY RUNDY --- */}
            {gameData.phase === 'SHOWDOWN' && (
                <div className="mt-4 bg-green-100 border-green-500 border-2 p-5 rounded-lg shadow-lg text-black">
                    <h2 className="text-2xl font-bold text-green-800 mb-2">Rozstrzygnięcie Rundy!</h2>
                    {gameData.winnerData ? (
                        <>
                            <p className="text-green-900 text-lg">Zwycięzca: <strong className="text-xl">{gameData.winnerData.username}</strong> zgarnia <strong className="text-green-700">${gameData.winnerData.pot}</strong>!</p>
                            <p className="text-sm text-green-700 italic mt-1">Z układem: {gameData.winnerData.handName}</p>
                        </>
                    ) : (
                        <p className="text-red-800 font-bold">Wszyscy spasowali!</p>
                    )}
                    
                    {isDealer && (
                        <Button className="mt-4 bg-purple-700 hover:bg-purple-600 text-white font-bold shadow" onClick={() => sendAction('START_VOTING')}>
                            Przejdź do głosowania
                        </Button>
                    )}
                </div>
            )}

            {/* --- EKRAN WYNIKÓW GŁOSOWANIA --- */}
            {gameData.phase === 'VOTING_RESULT' && (
                <div className="mt-4 bg-red-100 border-red-500 border-2 p-5 rounded-lg shadow-lg text-black">
                    <h2 className="text-2xl font-bold text-red-800 mb-2">Wyniki Głosowania</h2>
                    {gameData.kickedPlayer ? (
                        <p className="text-red-900 text-lg">Gracz <strong className="text-xl">{gameData.kickedPlayer}</strong> otrzymał wystarczającą liczbę głosów i zostaje wyrzucony ze stołu!</p>
                    ) : (
                        <p className="text-green-800 font-bold">Nikt nie zdobył 2 głosów. Nikt nie odpada.</p>
                    )}
                    
                    {isDealer && (
                        <Button className="mt-4 bg-green-700 hover:bg-green-600 text-white font-bold shadow" onClick={() => sendAction('NEXT_ROUND')}>
                            Rozpocznij następną rundę
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}