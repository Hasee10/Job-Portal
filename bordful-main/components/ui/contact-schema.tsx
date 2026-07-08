'use client';

import type { FC } from 'react';
import type { ContactPage, WithContext } from 'schema-dts';
import config from '@/config';
import { safeJsonLdStringify } from '@/lib/utils/json-ld';

type ContactSchemaProps = {
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  url?: string;
  description?: string;
};

export const ContactSchema: FC<ContactSchemaProps> = ({
  companyName = config.contact?.contactInfo?.companyName || config.title,
  email = config.contact?.contactInfo?.email || 'contact@example.com',
  // No fake fallbacks for phone/address - emitting a placeholder US number
  // and street into schema.org markup (which Google reads) is worse than
  // omitting them. Left undefined when unset so the fields are dropped below.
  phone = config.contact?.contactInfo?.phone || undefined,
  address = config.contact?.contactInfo?.address || undefined,
  url = `${config.url}/contact` || 'https://example.com/contact',
  description = config.contact?.schema?.description ||
    config.contact?.description ||
    'Get in touch with our team for any questions or support needs.',
}) => {
  // Create type-safe schema using schema-dts. Only include telephone/address
  // when they're actually set, so the structured data never carries
  // placeholder contact info.
  const contactSchema: WithContext<ContactPage> = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${companyName}`,
    description,
    mainEntity: {
      '@type': 'Organization',
      name: companyName,
      email,
      ...(phone ? { telephone: phone } : {}),
      ...(address
        ? {
            address: {
              '@type': 'PostalAddress',
              streetAddress: address,
            },
          }
        : {}),
      url: config.url,
    },
    url,
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(contactSchema) }}
      type="application/ld+json"
    />
  );
};
