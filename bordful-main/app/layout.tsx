import "./globals.css";
import type { Metadata } from "next";
import Script, { type ScriptProps } from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ResumePanelProvider } from "@/components/jobs/ResumePanelProvider";
import { SeekerJobStateProvider } from "@/components/jobs/SeekerJobStateContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Toaster } from "@/components/ui/toaster";
import { WebsiteSchema } from "@/components/ui/website-schema";
import config from "@/config";
import {
  geistMono,
  getBodyClass,
  getFontClass,
  ibmPlexSerif,
  inter,
} from "@/lib/utils/fonts";

type CustomScript = {
  src: string;
  strategy: ScriptProps["strategy"];
  attributes?: Record<string, string>;
};

const siteConfig = config;

export const metadata: Metadata = {
  alternates: {
    types: {
      "application/atom+xml": `${siteConfig.url}/atom.xml`,
      "application/feed+json": `${siteConfig.url}/feed.json`,
      "application/rss+xml": `${siteConfig.url}/feed.xml`,
    },
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      noimageindex: false,
    },
    index: true,
    nocache: false,
  },
  title: "Caliber | Careers and Procurement",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Read the session server-side so it's available on first paint (no
  // client-side fetch/loading flash for the Nav's sign-in state).
  const session = await auth();

  // Get the current font family from config
  const fontFamily = siteConfig?.font?.family || "geist";

  // Get font class based on configuration
  const fontClass = getFontClass(fontFamily);

  // Get appropriate body class
  const bodyClass = getBodyClass(fontFamily);

  // Determine which font variable classes to include
  const fontClasses: string[] = [];
  // Always add the selected font class first for CSS specificity
  fontClasses.push(fontClass);
  // Then add the other fonts
  fontClasses.push(geistMono.variable);
  fontClasses.push(inter.variable);
  fontClasses.push(ibmPlexSerif.variable);

  return (
    <html
      className={fontClasses.join(" ")}
      data-font={fontFamily}
      lang="en"
      // next-themes sets the "dark" class on <html> client-side before
      // React hydrates, which otherwise triggers a hydration-mismatch
      // warning - this is next-themes' own documented required attribute.
      suppressHydrationWarning
    >
      <body
        className={`${bodyClass} bg-background text-foreground transition-colors`}
      >
        {siteConfig.scripts.head.map((script: CustomScript) => (
          <Script
            key={`head-script-${script.src}`}
            src={script.src}
            strategy={script.strategy}
            {...script.attributes}
          />
        ))}
        <a
          href="#page-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthSessionProvider session={session}>
            <SeekerJobStateProvider>
              <ResumePanelProvider>
                <div className="flex min-h-screen flex-col">
                  <Nav />
                  {process.env.NODE_ENV === "development" &&
                    process.env.LOCAL_DEMO_DATA === "true" && (
                      <p className="border-b bg-amber-50 px-4 py-2 text-center text-amber-950 text-xs dark:bg-amber-950 dark:text-amber-100">
                        Local demo data: fictional jobs, tenders and businesses
                        for layout testing.
                      </p>
                    )}
                  <div className="flex-1" id="page-content" tabIndex={-1}>
                    <NuqsAdapter>{children}</NuqsAdapter>
                  </div>
                  <Footer />
                </div>
              </ResumePanelProvider>
              <Toaster />
            </SeekerJobStateProvider>
          </AuthSessionProvider>
        </ThemeProvider>
        {siteConfig.scripts.body.map((script: CustomScript) => (
          <Script
            key={`body-script-${script.src || "inline"}`}
            src={script.src}
            strategy={script.strategy}
            {...script.attributes}
          />
        ))}

        <WebsiteSchema />
      </body>
    </html>
  );
}
