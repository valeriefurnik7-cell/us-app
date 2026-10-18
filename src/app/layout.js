import './globals.css';
import AppShell from '@/components/AppShell';
import { themeInitScript } from '@/components/ThemeProvider';
import ServiceWorker from '@/components/ServiceWorker';

export const metadata = {
  title: 'Us',
  description: 'An app for two',
  appleWebApp: {
    capable: true,
    title: 'Us',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
