import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { ClientLayout } from "./ClientLayout"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
})

export const metadata: Metadata = {
  title: "Mission Control",
  description: "AI Operations Command Center",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-screen"
        style={{
          background: "var(--bg-base)",
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(14, 165, 233, 0.08) 0%, transparent 70%)",
        }}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
