import type { Metadata } from 'next';
import config from '@/config';
import { JoinChooser } from '@/components/auth/JoinChooser';

export const metadata: Metadata = {
  title: `Join ${config.title}`,
  description: 'Choose how you want to use the platform.',
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return (
    <main className="min-h-[60vh] bg-background py-16">
      <div className="container mx-auto px-4">
        <JoinChooser siteTitle={config.title} />
      </div>
    </main>
  );
}
