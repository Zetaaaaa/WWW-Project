import Navbar from "./Components/navbar"
import '@/app/globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={cn("font-sans", geist.variable)}>
            <body className="h-screen dark flex flex-col">
                <main className="flex-1">{children}</main>
            </body>
        </html>
    )
}