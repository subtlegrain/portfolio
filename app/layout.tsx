import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Manrope } from 'next/font/google'
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site'
import './portfolio.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    ...(siteUrl ? { url: '/' } : {}),
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  ...(siteUrl ? { alternates: { canonical: '/' } } : {}),
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2ec' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0d' },
  ],
}

const themeScript = `(function(){try{var stored=window.localStorage.getItem('sk-theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored==='light'||stored==='dark'?stored:(prefersDark?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.dataset.theme='light';}})();`

const neuralScript = `(function(){try{var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;var done=false;var raw=window.sessionStorage.getItem('sk-neural-reveal');if(raw){try{var cached=JSON.parse(raw);done=!!(cached&&cached.version===1&&cached.decoded==='SUDIP KHATRI');}catch(e){}}document.documentElement.dataset.neural=(reduced||done)?'done':'fresh';}catch(e){document.documentElement.dataset.neural='fresh';}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: neuralScript }} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
