import type {Metadata} from 'next';
import { Kantumruy_Pro } from 'next/font/google';
import './globals.css'; // Global styles

const kantumruyPro = Kantumruy_Pro({
  subsets: ['khmer', 'latin'],
  variable: '--font-kantumruy-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SecureAttend | ប្រព័ន្ធគ្រប់គ្រងវត្តមាន',
  description: 'Multi-tenant employee attendance and HR/payroll system.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="km" className={`${kantumruyPro.variable}`}>
      <body className="font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
