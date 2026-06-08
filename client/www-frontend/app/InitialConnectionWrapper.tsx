'use client'
import React, { useEffect, useState } from 'react'
import Main from "./Components/Main";
import { ensureUuidCookie, setTokenCookie } from './actions'; // Import your action

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getToken } from '@/app/actions'; // Import your action

function InitialConnectionWrapper() {
    const [isOpen, setIsOpen] = useState(false)
    const [userName, setUsername] = useState<string>('user')
    const [userAuth, setUserAuth] = useState(false)



    useEffect(() => {

        async function userExisits() {
            const tokenCheck = await getToken();


            // Correct way to check if tokenCheck is null, undefined, or falsey
            if (tokenCheck) {
                // console.log("Token is in place");
                setUserAuth(true)
            }
            else {
                console.log("Token is missing or invalid");
                setIsOpen(true);
            }

        }
        userExisits()
    }, [])

    async function init() {
        console.log(userName);
        const uuid = await ensureUuidCookie();
        // console.log(uuid + userName);

        const tokenString = `${uuid}TOKENSTRING${userName}`

        console.log(tokenString);

        const response = await fetch('http://localhost:3001/api/token', {
            method: "POST",
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({ uuid: uuid, username: userName })
        }
        );


        //TOKEN HANDLING
        const token = await response.text()

        if (token) {
            setTokenCookie(token)
            setIsOpen(false)
            setUserAuth(true)
        }

    }
    // useEffect(() => {

    // }, [check]); // Runs every time 'check' updates

    function confirmData() {
        init();
    }



    return (
        <>
            <Dialog defaultOpen={true} open={isOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-70/100">
                    <DialogHeader>
                        <DialogTitle>Hello!</DialogTitle>
                        <DialogDescription>
                            Before we begin please let us know who you are by creating a username
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup>
                        <Field>
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" name="username" placeholder="The biggest liar" defaultValue={"user"} onInput={(e) => { setUsername(e.currentTarget.value) }} />
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        {/* <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose> */}
                        <Button onClick={() => confirmData()}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {userAuth == true ?
                <Main userName={userName}></Main>
                : <p>Awaiting initial configuration</p>}
        </>
    )
}
export default InitialConnectionWrapper
