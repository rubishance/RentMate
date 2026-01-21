import { useTranslations } from 'next-intl';
import Hero from '@/components/Hero';
import InstagramWidget from '@/components/InstagramWidget';

export default function Home() {
  return (
    <main>
      <Hero />
      <InstagramWidget />
    </main>
  );
}
