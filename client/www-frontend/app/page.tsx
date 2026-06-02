/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import Navbar from "./Components/navbar";
import InitialConnectionWrapper from "./InitialConnectionWrapper";





function page() {

  return (
    <div className="w-full h-full">
      <Navbar></Navbar>
      <div className="w-full h-[calc(100vh-4rem)]">
        <InitialConnectionWrapper></InitialConnectionWrapper>
      </div>
    
    </div>

  )
}

export default page
