

interface ResponseBoxProps{
    readFromParent: ()=>void
}

function ResponseBox( {readFromParent}: ResponseBoxProps) {
  return (
    <div>
        <p>Chat here</p>
    </div>
  )
}

export default ResponseBox