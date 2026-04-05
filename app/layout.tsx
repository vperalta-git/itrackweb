import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import itrackLogo from '@/media/itrackred.png'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'I-TRACK | Isuzu Pasig',
  description: 'I-TRACK - Vehicle Inventory and Tracking System for Isuzu Pasig',
  keywords: ['isuzu', 'pasig', 'vehicle', 'inventory', 'tracking', 'dealership'],
  icons: {
    icon: itrackLogo.src,
    shortcut: itrackLogo.src,
    apple: itrackLogo.src,
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen bg-background"
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="light">
          {children}
          <Toaster position="top-right" richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
