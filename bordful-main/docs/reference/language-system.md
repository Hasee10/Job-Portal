---
title: Enhanced Language System
description: Documentation for Bordful's comprehensive internationalization-ready language system.
lastUpdated: "2025-05-22"
---

Bordful features a comprehensive internationalization-ready language system designed to support multiple languages in your job board:

## Key Features

- Full ISO 639-1 support with all 184 language codes
- User-friendly Airtable format: "Language Name (code)" (e.g., "English (en)")
- Flexible matching for both language names and codes
- Language filtering with alphabetical sorting
- SEO-optimized language URLs using standard codes
- Automatic bidirectional mapping between codes and names
- Foundational support for multilingual job boards

## Airtable Setup

In your Airtable base, set up the `languages` field as a Multiple Select with options formatted as `Language Name (code)`, for example:

```
English (en)
Spanish (es)
French (fr)
German (de)
Japanese (ja)
```

This approach combines human readability in Airtable with the benefits of standardized language codes in your application.

## How It Works

1. **Data Entry**: Users enter languages in Airtable using the friendly "Language Name (code)" format
2. **Processing**: The system automatically extracts language codes for URL generation
3. **URL Structure**: Language-specific URLs use standard codes (e.g., `/jobs/language/en`)
4. **Bidirectional Mapping**: The system can convert between codes and names as needed
5. **Filtering**: Users can filter jobs by language with alphabetically sorted options

## Implementation Details

### Core Language Data (`lib/constants/languages.ts`)

The core of the language system is implemented in `lib/constants/languages.ts`, which provides:

1. **Complete ISO 639-1 Language Database**: All 184 standard language codes with their English names
2. **Type Definitions**: TypeScript types for language codes, names, and definitions
3. **Lookup Maps**: Fast bidirectional mappings between language codes and names
4. **Utility Functions**: Helper functions for language operations

```typescript
// Type definitions
export interface LanguageDefinition {
  code: string;   // ISO 639-1 code (e.g., "fr")
  name: string;   // Full English name (e.g., "French")
  displayName?: string;  // Optional different display name if needed
}

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type LanguageName = (typeof LANGUAGES)[number]["name"];

// Sample of the language database (184 total languages)
export const LANGUAGES: LanguageDefinition[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  // ... and 179 more languages
] as const;

// Fast lookup maps
export const CODE_TO_LANGUAGE: Record<LanguageCode, LanguageDefinition> = 
  Object.fromEntries(LANGUAGES.map((lang) => [lang.code, lang]));

export const NAME_TO_LANGUAGE: Record<LanguageName, LanguageDefinition> = 
  Object.fromEntries(LANGUAGES.map((lang) => [lang.name, lang]));

// Utility functions
export function getLanguageByCode(code: string): LanguageDefinition | undefined {
  return CODE_TO_LANGUAGE[code as LanguageCode];
}

export function getLanguageByName(name: string): LanguageDefinition | undefined {
  // Implementation includes exact, case-insensitive, and partial matching
}

// UI helper functions
export function getDisplayNameFromCode(code: LanguageCode): string {
  const language = getLanguageByCode(code);
  return language?.displayName || language?.name || code;
}

export function getAllLanguageOptions() {
  return LANGUAGES.map((lang) => ({
    code: lang.code,
    name: lang.name,
    displayName: lang.displayName || lang.name,
  }));
}
```

### Route Configuration (`lib/config/routes.ts`)

The language system relies on the application's route configuration defined in `lib/config/routes.ts`:

```typescript
// Route configuration
export const routes: RouteConfig[] = [
  // ... other routes
  {
    path: "/jobs/language/[language]",
    name: "Language",
  },
  {
    path: "/jobs/languages",
    name: "Languages",
  },
  // ... other routes
];
```

These routes define:
- `/jobs/language/[language]` - Dynamic route for language-specific job listings (e.g., `/jobs/language/en`)
- `/jobs/languages` - Static route for the languages directory page

The route system includes helper functions for working with dynamic parameters:

```typescript
// Helper function to extract params from dynamic route
export function extractParams(
  path: string,
  route: RouteConfig
): Record<string, string> {
  // Implementation that extracts language code from the URL
}
```

### Parsing Language Strings

The system uses regular expressions to extract language codes from the formatted strings:

```typescript
// Example code for extracting language code
function extractLanguageCode(languageString: string): string {
  const match = languageString.match(/\(([a-z]{2})\)$/i);
  return match ? match[1].toLowerCase() : languageString.toLowerCase();
}
```

Language names are similarly extracted for display purposes:

```typescript
// Example code for extracting language name
function extractLanguageName(languageString: string): string {
  return languageString.replace(/\s*\([a-z]{2}\)$/i, '').trim();
}
```

## Language Pages

The system automatically generates language-specific pages at `/jobs/language/[language]` for each language used in your job listings. The language directory is available at `/jobs/languages`.

## UI Integration

### Language Filtering

The language system integrates with the job filtering UI to provide an intuitive language selection experience:

1. **Language Filter Component**: Displays languages alphabetically in a dropdown or multiselect
2. **URL Parameter Support**: Selected languages are reflected in URL parameters (e.g., `?languages=en,fr,de`)
3. **Persistence**: Filter selections are preserved across page navigation
4. **Clear Functionality**: One-click reset of language filters

### Languages Directory

The `/jobs/languages` page provides:

1. **Language Cards**: Visual cards for each language used in job listings
2. **Job Counts**: Number of jobs available for each language
3. **Automatic Updates**: Language options update as new languages are used in job listings
4. **SEO Benefits**: Individual language pages improve discoverability for language-specific job searches

### URL Structure

The system creates semantic URLs for language-specific pages:

- `/jobs/language/en` - Jobs requiring English
- `/jobs/language/fr` - Jobs requiring French
- `/jobs/languages` - Directory of all available languages

## Extending the Language System

### Adding Custom Display Names

You can customize how languages are displayed by adding a `displayName` property:

```typescript
// Example of adding custom display names
const CUSTOM_LANGUAGES: LanguageDefinition[] = [
  { code: "en", name: "English", displayName: "English (Global)" },
  { code: "es", name: "Spanish", displayName: "Spanish/Español" },
  // ... more customizations
];
```

### Supporting Additional Language Formats

The language system can be extended to support other formats by modifying the parsing functions to recognize your preferred format.

## Multilingual Support

While the current implementation focuses on supporting multiple job languages, this architecture provides a foundation for future full multilingual support where the entire interface could be available in multiple languages.

## Related Documentation

- [Multi-language Configuration](/docs/examples/multi-language-configuration.md)
- [Language Codes Reference](/docs/reference/language-codes.md)
- [Job Filtering System](/docs/guides/filtering-system.md) 