'use client'
import React, { useEffect, useState } from 'react'
import Main from "./Components/Main";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { ensureUuidCookie,setTokenCookie } from './actions'; // Import your action

export default function InitialConnectionWrapper() {

    useEffect(()=>{
        async function init() {
            const uuid = await ensureUuidCookie();
            console.log(uuid);
            
            const response = await fetch('http://localhost:3001/api/token', { method: "POST",
                headers:{
                    'content-type': 'application/json',
                },
                body:JSON.stringify({uuid:uuid}) }
            );
            
            const token = await response.text()
            setTokenCookie(token)
             
        }
        init();
 


    },[])

  


    return (
        <Main></Main>
    )
}

