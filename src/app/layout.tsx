import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nexora Commerce — Modern Online Shopping',
    template: '%s | Nexora Commerce',
  },
  description:
    'Nexora Commerce — A modern, secure, full-stack e-commerce platform built with Next.js, TypeScript, and PostgreSQL.',
  keywords: ['e-commerce', 'shop', 'nexora', 'online store', 'shopping'],
  authors: [{ name: 'Nexora Commerce' }],
  creator: 'Nexora Commerce',
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Nexora Commerce',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <div className="site-wrapper">
            <Navbar />
            <main className="main-content">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
