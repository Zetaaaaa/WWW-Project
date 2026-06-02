import { io } from "socket.io-client";

// This variable stays in memory outside of React's component lifecycle
let socketInstance: any = null;

//ensuring singleton - only one socket per client
export const getSocket = (token: string) => {
    if (!socketInstance) {
        // console.log("NEW SOCKET");
        socketInstance = io("ws://localhost:1145", {
            auth: { token },
        });
    }
    return socketInstance;
};