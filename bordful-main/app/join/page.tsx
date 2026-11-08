import type { Metadata } from "next";
import { JoinChooser } from "@/components/auth/JoinChooser";
import config from "@/config";

export const metadata: Metadata = {
  description: "Choose how you want to use the platform.",
  robots: { follow: false, index: false },
  title: `Join ${config.title}`,
};

export default function JoinPage() {
  return (
    <main className="min-h-[60vh] bg-gradient-to-b from-zinc-50 to-white py-16 dark:from-zinc-950 dark:to-background">
      <div className="container mx-auto px-4">
        <JoinChooser siteTitle={config.title} />
      </div>
    </main>
  );
}
