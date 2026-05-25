import {Button} from "react"


interface ActionProps {
    functions: {
        name:string
        action:((websocket:any) => void),
    }[],
    websocket: WebSocket

}
function Actions({ functions,websocket }: ActionProps) {

    return (

        <div>
            {functions.map((func, index) => (
                <button className="w-10 h-10 bg-red-100" key={index} onClick={()=>func.action(websocket)}>
                    {func.name}
                </button>
            ))}

        </div>
    )
}

export default Actions
