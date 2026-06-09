'use client'
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { checkAccess } from '@/app/actions'
import { getToken } from '@/app/actions'; // Import your action
import MainLobby from './MainLobby';
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

function InitialLobbyWrapper() {
    const [isAllowed, setAllowed] = useState<boolean>(true)
    const [lobbyName, setlobbyName] = useState<string | null>(null);
    const pathname = usePathname()
    const params = useParams<{ tag: string; item: string }>()
    const router = useRouter();
    useEffect(() => {
        let isMounted = true; // Guard against setting state on unmounted component

        async function initialLobby() {
            const resolvedParams = await params;
            const lobby = resolvedParams?.lobby;

            // Don't check if we don't have a lobby yet
            if (!lobby) return;

            const tokenCheck = await getToken();
            const allow = await checkAccess(tokenCheck, lobby);

            // Check if component is still mounted before proceeding
            if (!isMounted) return;

            console.log("Access result:", allow);

            

            if (!allow) {
                console.log("Access denied");
                router.replace("/404");
            } else {
                console.log("Access granted");
                setAllowed(true);
            }
        }

        initialLobby();

        return () => { isMounted = false; };
        // Use specific properties instead of the whole objects
    }, [params?.lobby, pathname, router]);

    return (
        isAllowed ? <MainLobby /> : <p>YOU CANT</p>
    )
}

export default InitialLobbyWrapper
