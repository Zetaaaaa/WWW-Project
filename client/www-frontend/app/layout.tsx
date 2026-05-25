import Navbar from "./Components/navbar"
import '@/app/globals.css'
export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="h-screen flex flex-col" >
                <Navbar></Navbar>
                <main className="flex-1">{children}</main>
            </body>
        </html>
    )
}