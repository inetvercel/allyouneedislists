import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: {
    default: 'All You Need Is Lists',
    template: '%s | All You Need Is Lists',
  },
  description: 'Your go-to destination for the best lists on the internet. Discover top 5s, top 10s, and everything in between.',
  metadataBase: new URL('https://allyouneedislists.com'),
  openGraph: {
    siteName: 'All You Need Is Lists',
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    types: {
      'application/rss+xml': 'https://allyouneedislists.com/feed.xml',
    },
  },
  verification: {
    google: 'PASTE_YOUR_CODE_HERE',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
