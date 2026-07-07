import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Khmer } from 'next/font/google';
import './globals.css';

// Latin uses Inter; Khmer glyphs fall through to Noto Sans Khmer (per-glyph),
// which renders Khmer's stacked subscripts correctly. Stacked via CSS vars.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const khmer = Noto_Sans_Khmer({ subsets: ['khmer'], variable: '--font-khmer', display: 'swap' });

export const metadata: Metadata = {
  title: 'AngkorGo — Admin',
  description: 'Help is on the way.',
};

// Correct scaling on all mobile browsers.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${khmer.variable}`}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
