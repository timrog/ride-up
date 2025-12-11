import type { Metadata } from "next"
import { Nunito, Big_Shoulders } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import Navbar from "@/components/Navbar"

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
    shortcut: "/icon.png",
    apple: "/icon.png"
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${sansFont.variable} ${headingFont.variable}`}>
        <Providers>
          <div className="relative flex flex-col h-screen">
            <Navbar />
            <main>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}


