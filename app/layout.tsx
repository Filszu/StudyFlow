import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ColorThemeProvider } from '@/components/color-theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'StudyFlow - Smart Study Planner with Spaced Repetition',
  description: 'Master any subject with StudyFlow. Organize study tasks, track your progress, and leverage Anki-style spaced repetition to remember everything you learn.',
  keywords: ['study planner', 'spaced repetition', 'learning app', 'student productivity', 'exam preparation', 'task manager', 'study tracker', 'Anki alternative'],
  authors: [{ name: 'filszu', url: 'https://filszu.vercel.app' }],
  creator: 'filszu',
  publisher: 'StudyFlow',
  generator: 'Next.js',
  applicationName: 'StudyFlow',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://studyflow.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://studyflow.vercel.app',
    siteName: 'StudyFlow',
    title: 'StudyFlow - Smart Study Planner with Spaced Repetition',
    description: 'Master any subject with StudyFlow. Organize study tasks, track your progress, and leverage Anki-style spaced repetition to remember everything you learn.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'StudyFlow - Smart Study Planner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StudyFlow - Smart Study Planner with Spaced Repetition',
    description: 'Master any subject with StudyFlow. Organize study tasks, track your progress, and leverage Anki-style spaced repetition.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  category: 'education',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StudyFlow" />
      </head>
      <body className="font-sans antialiased bg-background">
        <ColorThemeProvider>
          {children}
        </ColorThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
