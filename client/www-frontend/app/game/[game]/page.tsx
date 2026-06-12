'use client'

import InitialGameWrapper from "./InitialGameWrapper"

function Game({ params }: { params: Promise<{ lobby: string }> }) {

  
   
    return (
        <div>
            <InitialGameWrapper></InitialGameWrapper>
        </div>
    )
}

export default Game
