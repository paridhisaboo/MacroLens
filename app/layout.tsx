import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
})
const inter = Inter({ variable: '--font-sans', subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ variable: '--font-mono', weight: ['400', '500'], subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MacroLens',
  description: 'Track your nutrition with precision',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}