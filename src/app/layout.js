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
  themeColor: '#000000', // dark by default; ThemeProvider updates it when the theme changes
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
