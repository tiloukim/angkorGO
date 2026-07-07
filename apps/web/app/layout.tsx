import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Clean geometric grotesque — closest freely-available match to Uber Move.
const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'AngkorGo — Admin',
  description: 'Help is on the way.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
