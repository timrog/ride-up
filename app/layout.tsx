import type { Metadata } from "next"
import { Nunito, Big_Shoulders } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import Navbar from "@/components/Navbar"
import DrawerPortal from "./DrawerPortal"

const sansFont = Nunito({
  variable: "--font-sans",
  weight: "variable",
  subsets: ["latin"],
})

const headingFont = Big_Shoulders({
  variable: "--font-heading",
  weight: "800",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "VCGH Signups",
  description: "VCGH event listing and sign-up",
  icons: {
    icon: "/icon.png",
    shortcut: "/app-icon.png",
    apple: "/app-icon.png"
  }
}

export default function RootLayout({
  main, children
}: Readonly<{
  main: React.ReactNode,
  children?: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${sansFont.variable} ${headingFont.variable}`}>
        <Providers>
          <div className="relative flex flex-col h-screen">
            <Navbar />
            <main>
              {main}
            </main>
            <DrawerPortal>
              {children}
            </DrawerPortal>
          </div>
        </Providers>
      </body>
    </html>
  )
}


