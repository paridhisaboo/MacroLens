import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const dmSans = DM_Sans({ variable: '--font-sans', subsets: ['latin'] })
const dmMono = DM_Mono({ variable: '--font-mono', weight: ['400', '500'], subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MacroLens',
  description: 'Track your nutrition with precision',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}