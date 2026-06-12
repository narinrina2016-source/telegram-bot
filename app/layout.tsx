import type {Metadata} from 'next';
import { Kantumruy_Pro } from 'next/font/google';
import './globals.css';

const kantumruyPro = Kantumruy_Pro({
  subsets: ['khmer', 'latin'],
  variable: '--font-kantumruy-pro',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SecureAttend | ប្រព័ន្ធគ្រប់គ្រងវត្តមាន',
  description: 'Multi-tenant employee attendance and HR/payroll system.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="km" className={`${kantumruyPro.variable} font-sans`} suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className={`${kantumruyPro.className} text-slate-800 antialiased leading-relaxed tracking-wide bg-slate-50`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
