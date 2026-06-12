export default function GameLayout({
    children,
}: {
    children: React.ReactNode
}) {

    return (
        <div>
            {/* <p>main</p> */}
            <main>{children}</main>
        </div>
    )
}

