"use client";

import type { FC } from "react";
import type { AboutPage, WithContext } from "schema-dts";
import config from "@/config";
import { safeJsonLdStringify } from "@/lib/utils/json-ld";

type AboutSchemaProps = {
  companyName?: string;
  description?: string;
  url?: string;
  logo?: string;
};

export const AboutSchema: FC<AboutSchemaProps> = ({
  companyName = config.title,
  description = "Learn about our mission to connect talented professionals with exciting career opportunities.",
  url = `${config.url}/about` || "https://example.com/about",
  logo = config.nav?.logo?.enabled
    ? `${config.url}${config.nav.logo.src}`
    : undefined,
}) => {
  // Create type-safe schema using schema-dts
  const aboutSchema: WithContext<AboutPage> = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    description,
    mainEntity: {
      "@type": "Organization",
      description,
      name: companyName,
      url: config.url,
      ...(logo && { logo }),
    },
    name: `About ${companyName}`,
    url,
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(aboutSchema) }}
      type="application/ld+json"
    />
  );
};
