import { type Country, countries } from './countries';
import type { RemoteRegion, WorkplaceType } from './workplace';

export type LocationType = 'remote' | Country;

export type LocationCounts = {
  countries: Partial<Record<Country, number>>;
  cities: Record<string, number>;
  remote: number;
};

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
};

export function formatLocationTitle(location: string): string {
  if (location.toLowerCase() === 'remote') {
    return 'Remote';
  }

  // Expand US state abbreviations (e.g. "CA" → "California")
  const upper = location.trim().toUpperCase();
  if (US_STATES[upper]) {
    return US_STATES[upper];
  }

  // Match against the canonical countries list
  const matchedCountry = countries.find(
    (country) => country.toLowerCase() === location.toLowerCase()
  );
  if (matchedCountry) {
    return matchedCountry;
  }

  // Fall back to title case for cities / freeform strings
  return location
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Creates a URL-friendly slug from a location string
 * @param location Location string to convert to slug
 * @returns URL-friendly slug
 */
export function createLocationSlug(location: string): string {
  if (!location) {
    return '';
  }

  return location
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Converts a URL slug back to a country name
 * @param slug URL slug to convert
 * @returns Matched country or null if not found
 */
export function getCountryFromSlug(slug: string): Country | null {
  if (!slug) {
    return null;
  }

  // Handle remote case
  if (slug.toLowerCase() === 'remote') {
    return null;
  }

  // Find matching country by comparing slugs
  const matchedCountry = countries.find(
    (country) => createLocationSlug(country) === slug.toLowerCase()
  );

  return matchedCountry || null;
}

/**
 * Formats a complete location string based on workplace settings
 */
export function formatLocation({
  workplace_type,
  remote_region,
  workplace_city,
  workplace_country,
}: {
  workplace_type: WorkplaceType;
  remote_region: RemoteRegion;
  workplace_city: string | null;
  workplace_country: string | null;
}): string {
  // Handle remote work
  if (workplace_type === 'Remote') {
    return `Remote (${remote_region || 'Worldwide'})`;
  }

  // Build location string
  const locationParts = [
    workplace_city && formatLocationTitle(workplace_city),
    workplace_country && formatLocationTitle(workplace_country),
  ].filter(Boolean);

  const locationString =
    locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';

  // Add hybrid indicator if applicable
  if (workplace_type === 'Hybrid') {
    return `${locationString} - Hybrid${
      remote_region ? ` (${remote_region})` : ''
    }`;
  }

  return locationString;
}
