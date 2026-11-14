import './globals.css';
import brand from '../lib/brand';
import PWARegister from '../components/PWARegister';

export const metadata = { title: { default: brand.name, template: `%s · ${brand.name}` }, description: brand.tagline, manifest: '/manifest.json', applicationName: brand.name, appleWebApp: { capable: true, statusBarStyle: 'default', title: brand.name }, icons: { icon: '/icons/app-icon.svg', apple: '/icons/app-icon.svg' } };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#FEFAE7' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<PWARegister /></body>
    </html>
  );
}
