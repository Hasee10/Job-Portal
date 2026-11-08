import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { MetadataBreadcrumb } from "@/components/ui/metadata-breadcrumb";
import config from "@/config";

// Add metadata for SEO
export const metadata: Metadata = {
  alternates: {
    canonical: "/changelog",
    languages: {
      en: `${config.url}/changelog`,
      "x-default": `${config.url}/changelog`,
    },
  },
  description:
    "Stay up to date with the latest features, improvements, and bug fixes in our job board platform. Track our progress and see what's new.",
  keywords:
    "changelog, updates, features, improvements, job board updates, release notes",
  openGraph: {
    description:
      "Stay up to date with the latest features, improvements, and bug fixes in our job board platform. Track our progress and see what's new.",
    title: "Changelog | Latest Updates and Improvements",
    type: "website",
    url: `${config.url}/changelog`,
  },
  title: "Changelog | Latest Updates and Improvements",
  twitter: {
    card: "summary_large_image",
    description:
      "Stay up to date with the latest features, improvements, and bug fixes in our job board platform. Track our progress and see what's new.",
    title: "Changelog | Latest Updates and Improvements",
  },
};

// This page will be static
export const dynamic = "force-static";

function getChangelogContent() {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  const content = fs.readFileSync(filePath, "utf8");
  return content;
}

export default function ChangelogPage() {
  const content = getChangelogContent();

  return (
    <main className="container py-8">
      <div className="max-w-[700px]">
        <div className="mb-6">
          <MetadataBreadcrumb metadata={metadata} pathname="/changelog" />
        </div>

        <div className="prose prose-sm prose-gray max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </main>
  );
}
