// app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import '../lib/authConfig';

console.log('Layout loading...');

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Guess The Lines',
  description: 'The Easiest Way to Play Along With Bill and Sal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('Layout rendering...');
  
  return (
    <html lang="en">
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}