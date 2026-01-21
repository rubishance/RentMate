import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SkipLink from '@/components/SkipLink';
import AccessibilityMenu from '@/components/AccessibilityMenu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AYDesign - Graphic Web Designer & AI Artist',
  description: 'Portfolio of Avihay Simhi - Graphic Web Designer & AI Artist',
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SkipLink />
          <Navbar />
          <main id="main-content" style={{ minHeight: '80vh' }}>
            {children}
          </main>
          <Footer />
          <AccessibilityMenu />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
