/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useEffect, useState } from "react";
import Navbar from "./Components/navbar";
import Main from "./Components/Main";


function page() {

 

  return (
    <div className="w-full h-full">
      <Navbar></Navbar>
      <div className="w-full h-[calc(100vh-4rem)]">
        <Main></Main>
      </div>
    
    </div>

  )
}

export default page
