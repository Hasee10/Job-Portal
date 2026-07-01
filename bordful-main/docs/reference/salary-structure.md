---
title: Salary Structure
description: Learn about Bordful's comprehensive salary handling system supporting global currencies, cryptocurrencies, and various display formats.
lastUpdated: "2025-05-22"
---

# Salary Structure

Bordful includes a sophisticated salary handling system that supports multiple currencies, formats, and display options. This feature ensures that job listings provide clear, consistent salary information regardless of currency or payment structure.

## Overview

The salary structure in Bordful is designed to be:

- **Comprehensive**: Supporting global currencies, cryptocurrencies, and various time units
- **Flexible**: Accommodating different salary formats and display preferences
- **User-friendly**: Providing clear, readable salary information for job seekers
- **SEO-optimized**: Properly structured for search engines and job aggregators

## Key Features

### Salary Ranges

Bordful supports minimum and maximum salary ranges to provide candidates with a clear understanding of compensation:

```typescript
// Example job data
{
  salary_min: 50000,
  salary_max: 75000,
  salary_currency: "USD",
  salary_unit: "year"
}
```

The system properly handles:
- Single values (when min and max are the same)
- Open ranges (when only min or max is provided)
- Full ranges (both min and max specified)

### Currency Support

#### Global Currencies

Bordful supports 50+ global currencies with proper symbols and formatting:

| Currency        | Symbol | Example    | Notes               |
| --------------- | ------ | ---------- | ------------------- |
| USD             | $      | $75,000    | Default currency    |
| EUR             | €      | €65,000    | European formatting |
| GBP             | £      | £55,000    | British formatting  |
| JPY             | ¥      | ¥8,000,000 | No decimal places   |
| INR             | ₹      | ₹1,500,000 | Indian formatting   |
| AUD             | A$     | A$80,000   | Australian dollar   |
| CAD             | C$     | C$70,000   | Canadian dollar     |
| CNY             | ¥      | ¥500,000   | Chinese yuan        |
| and 40+ more... |        |            |                     |

#### Cryptocurrency Support

Bordful also supports major cryptocurrencies and stablecoins:

| Currency     | Symbol | Example      | Notes                       |
| ------------ | ------ | ------------ | --------------------------- |
| Bitcoin      | ₿      | ₿2.5         | With proper Bitcoin symbol  |
| Ethereum     | Ξ      | Ξ30          | With proper Ethereum symbol |
| XRP          | XRP    | XRP 50,000   |                             |
| USDT         | USDT   | USDT 70,000  | Tether stablecoin           |
| USDC         | USDC   | USDC 70,000  | USD Coin stablecoin         |
| PYUSD        | PYUSD  | PYUSD 70,000 | PayPal USD stablecoin       |
| Other tokens |        |              |                             |

All cryptocurrencies are properly normalized for sorting and filtering based on current exchange rates.

### Smart Formatting

#### Intelligent Spacing

The system automatically applies appropriate spacing between currency symbols and amounts:

- **No spaces** for common symbols: `$75,000`, `£55,000`, `€65,000`, `¥8,000,000`
- **Appropriate spacing** for multi-character symbols: `CHF 70,000`, `Rp 1,000,000`
- **Proper spacing** for non-Latin script symbols (Arabic, etc.)

#### Compact Number Formatting

Salary values are formatted with appropriate scale for readability:

- Values over 10,000 use "k" format: `$50k`, `€45k`
- Values over 1,000,000 use "M" format: `$1.2M`, `₩50M`
- Consistent scale in ranges: `$50k - $75k` (not mixing `$50k - $75,000`)

#### Time Unit Display

Salaries include the payment period for clarity:

- Hour: `$25/hour`
- Day: `$200/day`
- Week: `$1k/week`
- Month: `$4k/month`
- Year: `$50k/year` (default)
- Project: `$5k/project` (for contract or freelance work)

### Optional Currency Code Display

Bordful can optionally display the currency code for international clarity:

- With code: `$50k/year (USD)` or `₿0.5/year (BTC)`
- Without code: `$50k/year` or `₿0.5/year`

This is especially useful for currencies with similar symbols (e.g., USD, CAD, AUD all use $).

### Salary-Based Sorting

When users sort by salary, Bordful performs intelligent normalization:

1. All salaries are converted to annual amounts
2. All currencies are normalized to USD using current exchange rates
3. For salary ranges, sorting uses the midpoint of the range
4. Cryptocurrencies are converted based on current market rates

This ensures that salary sorting provides meaningful results regardless of currency or payment frequency.

## Implementation Details

### Currency Configuration

Currencies are configured in the configuration file:

```typescript
// config/config.ts
currency: {
  // Default currency code used when no currency is specified
  defaultCurrency: "USD" as CurrencyCode,

  // Allowed currencies for job listings
  // Set to null to allow all currencies, or specify a subset
  allowedCurrencies: ["USD", "EUR", "GBP", "BTC", "ETH", "USDT", "USDC"] as CurrencyCode[] | null,
  
  // Show currency code after amount (e.g., "$75k/year (USD)")
  showCurrencyCode: false,
  
  // Format to use for compact number display
  // Options: "standard" (75,000), "compact" (75k)
  numberFormat: "compact",
}
```

### Currency Data Structure

Currency information is stored in `lib/constants/currencies.ts`:

```typescript
export type CurrencyCode = "USD" | "EUR" | "GBP" | /* other currencies */ | "BTC" | "ETH";

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  symbolPosition: "before" | "after";
  spacing: boolean; // Whether to include space between symbol and amount
  decimalPlaces: number;
  isCrypto: boolean;
  rate?: number; // Exchange rate to USD (updated periodically)
}

// Example currency definition
export const currencies: Record<CurrencyCode, Currency> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    symbolPosition: "before",
    spacing: false,
    decimalPlaces: 2,
    isCrypto: false,
  },
  BTC: {
    code: "BTC",
    name: "Bitcoin",
    symbol: "₿",
    symbolPosition: "before",
    spacing: false,
    decimalPlaces: 8,
    isCrypto: true,
  },
  // Other currencies...
};
```

### Formatting Functions

Bordful provides utility functions for formatting salaries:

```typescript
// Formats a salary with proper currency symbol, scale, and time unit
formatSalary(amount: number, currency: CurrencyCode, unit: TimeUnit): string

// Formats a salary range
formatSalaryRange(min: number, max: number, currency: CurrencyCode, unit: TimeUnit): string

// Normalizes a salary to annual USD for comparison and sorting
normalizeSalary(amount: number, currency: CurrencyCode, unit: TimeUnit): number
```

## Customization Options

You can customize the salary display in your job board:

### Restricting Available Currencies

Limit the currencies available in your job board:

```typescript
// config/config.ts
currency: {
  allowedCurrencies: ["USD", "EUR", "GBP"] as CurrencyCode[],
  // Other settings...
}
```

### Display Format Options

Customize how salaries are displayed:

```typescript
// config/config.ts
salary: {
  // Show/hide currency code (USD, EUR, etc.)
  showCurrencyCode: true,
  
  // Show/hide salary ranges on job cards
  showOnCards: true,
  
  // Format options
  format: {
    // Use compact format (50k vs 50,000)
    useCompact: true,
    
    // Threshold for using 'k' format
    kThreshold: 10000,
    
    // Threshold for using 'M' format
    mThreshold: 1000000,
  },
  
  // Always show ranges, even if min and max are the same
  alwaysShowRange: false,
}
```

## Examples

Here are examples of how various salary configurations are displayed:

| Data                                                      | Display          | Notes            |
| --------------------------------------------------------- | ---------------- | ---------------- |
| `{min: 50000, max: 75000, currency: "USD", unit: "year"}` | $50k - $75k/year | Standard range   |
| `{min: 50000, max: 50000, currency: "USD", unit: "year"}` | $50k/year        | Single value     |
| `{min: 50000, max: null, currency: "USD", unit: "year"}`  | $50k+/year       | Open-ended range |
| `{min: null, max: 75000, currency: "USD", unit: "year"}`  | Up to $75k/year  | Maximum only     |
| `{min: 25, max: 35, currency: "USD", unit: "hour"}`       | $25 - $35/hour   | Hourly rate      |
| `{min: 0.5, max: 1.5, currency: "BTC", unit: "year"}`     | ₿0.5 - ₿1.5/year | Cryptocurrency   |
| `{min: 50000, max: 75000, currency: "EUR", unit: "year"}` | €50k - €75k/year | Euro             |

## Related Documentation

- [Currency Configuration](/docs/reference/currencies.md)
- [Configuration Guide](/docs/getting-started/configuration.md)
- [Job Filtering](/docs/guides/job-filtering.md)
- [Sorting Options](/docs/guides/sorting-options.md) 