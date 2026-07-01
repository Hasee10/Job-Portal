---
title: Currency System Reference
description: Documentation for Bordful's comprehensive currency support system including traditional currencies and cryptocurrencies.
lastUpdated: "2025-05-22"
---

# Currency System Reference

Bordful supports a wide range of currencies worldwide for job postings, including traditional fiat currencies and cryptocurrencies. This guide explains how the currency system works and how to configure it for your job board.

## Supported Currencies

Bordful offers extensive currency support with over 70 currencies available out of the box:

### Fiat Currencies

| Code | Name                   | Symbol | Notes                           |
| ---- | ---------------------- | ------ | ------------------------------- |
| USD  | United States Dollar   | $      | Base currency for normalization |
| EUR  | Euro                   | €      |                                 |
| GBP  | British Pound Sterling | £      |                                 |
| JPY  | Japanese Yen           | ¥      |                                 |
| AUD  | Australian Dollar      | $      |                                 |
| CAD  | Canadian Dollar        | $      |                                 |
| CHF  | Swiss Franc            | CHF    |                                 |
| CNY  | Chinese Yuan Renminbi  | ¥      |                                 |
| SEK  | Swedish Krona          | kr     |                                 |
| NZD  | New Zealand Dollar     | $      |                                 |
| MXN  | Mexican Peso           | $      |                                 |
| SGD  | Singapore Dollar       | $      |                                 |
| HKD  | Hong Kong Dollar       | $      |                                 |
| NOK  | Norwegian Krone        | kr     |                                 |
| KRW  | South Korean Won       | ₩      |                                 |
| TRY  | Turkish Lira           | ₺      |                                 |
| RUB  | Russian Ruble          | ₽      |                                 |
| INR  | Indian Rupee           | ₹      |                                 |
| BRL  | Brazilian Real         | R$     |                                 |
| ZAR  | South African Rand     | R      |                                 |
| PHP  | Philippine Peso        | ₱      |                                 |
| CZK  | Czech Koruna           | Kč     |                                 |
| IDR  | Indonesian Rupiah      | Rp     |                                 |
| MYR  | Malaysian Ringgit      | RM     |                                 |
| HUF  | Hungarian Forint       | Ft     |                                 |
| ISK  | Icelandic Krona        | kr     |                                 |
| BGN  | Bulgarian Lev          | лв     |                                 |
| THB  | Thai Baht              | ฿      |                                 |
| ILS  | Israeli New Shekel     | ₪      |                                 |
| CLP  | Chilean Peso           | $      |                                 |
| NGN  | Nigerian Naira         | ₦      |                                 |
| COP  | Colombian Peso         | $      |                                 |
| PKR  | Pakistani Rupee        | Rs.    |                                 |
| BDT  | Bangladeshi Taka       | Tk     |                                 |
| VND  | Vietnamese Dong        | ₫      |                                 |
| EGP  | Egyptian Pound         | £      |                                 |
| PEN  | Peruvian Sol           | S/     |                                 |
| KWD  | Kuwaiti Dinar          | د.ك    |                                 |
| SAR  | Saudi Riyal            | ر.س    |                                 |
| ARS  | Argentine Peso         | $      |                                 |
| UAH  | Ukrainian Hryvnia      | ₴      |                                 |
| RON  | Romanian Leu           | lei    |                                 |
| DKK  | Danish Krone           | kr     |                                 |
| PLN  | Polish Zloty           | zł     |                                 |
| QAR  | Qatari Riyal           | ر.ق    |                                 |
| BHD  | Bahraini Dinar         | د.ب    |                                 |
| OMR  | Omani Rial             | ر.ع.   |                                 |
| JOD  | Jordanian Dinar        | JD     |                                 |

### Cryptocurrencies

#### Stablecoins (USD-pegged)

| Code  | Name            | Symbol | Notes                        |
| ----- | --------------- | ------ | ---------------------------- |
| USDT  | Tether USD      | $      | Displays with (USDT) suffix  |
| USDC  | USD Coin        | $      | Displays with (USDC) suffix  |
| USDS  | USDS Stablecoin | $      | Displays with (USDS) suffix  |
| PYUSD | PayPal USD      | $      | Displays with (PYUSD) suffix |
| TUSD  | True USD        | $      | Displays with (TUSD) suffix  |

#### Major Cryptocurrencies

| Code | Name         | Symbol | Notes                       |
| ---- | ------------ | ------ | --------------------------- |
| BTC  | Bitcoin      | ₿      | Native symbol               |
| ETH  | Ethereum     | Ξ      | Native symbol               |
| XRP  | Ripple       | $      | Displays with (XRP) suffix  |
| BNB  | BNB          | $      | Displays with (BNB) suffix  |
| SOL  | Solana       | $      | Displays with (SOL) suffix  |
| ADA  | Cardano      | $      | Displays with (ADA) suffix  |
| DOGE | Dogecoin     | $      | Displays with (DOGE) suffix |
| TRX  | Tron         | $      | Displays with (TRX) suffix  |
| XLM  | Stellar      | $      | Displays with (XLM) suffix  |
| AVAX | Avalanche    | $      | Displays with (AVAX) suffix |
| SHIB | Shiba Inu    | $      | Displays with (SHIB) suffix |
| LTC  | Litecoin     | $      | Displays with (LTC) suffix  |
| BCH  | Bitcoin Cash | $      | Displays with (BCH) suffix  |
| DOT  | Polkadot     | $      | Displays with (DOT) suffix  |
| XMR  | Monero       | $      | Displays with (XMR) suffix  |

## How the Currency System Works

### Core Functionality

The currency system provides these key features:

1. **Consistent Display**: Proper currency symbols with appropriate spacing
2. **Salary Formatting**: Intelligent formatting with proper units (K for thousands, M for millions)
3. **Normalization**: Approximate conversion to USD for sorting and filtering
4. **Type Safety**: Full TypeScript support with currency codes as a union type

### Implementation Details

The currency system is primarily implemented in:

- `lib/constants/currencies.ts`: Currency definitions, codes, symbols, and exchange rates
- `lib/utils/formatSalary.ts`: Formatting functions for displaying salaries with proper symbols

### Display Rules

Bordful intelligently handles currency display with the following rules:

1. **Symbol Placement**: Currency symbols are placed before the amount (e.g., $50,000)
2. **Spacing**: Some currencies require a space after the symbol (e.g., "CHF 50,000" vs "$50,000")
3. **Code Display**: Cryptocurrencies display with their code in parentheses (e.g., $50,000 (USDT))
4. **Special Symbols**: Bitcoin (₿) and Ethereum (Ξ) display with their unique symbols

### Salary Normalization

For sorting and filtering, all salaries are normalized to USD using approximate exchange rates. This allows users to sort jobs by salary across different currencies.

```typescript
// Example of internal normalization (simplified)
function normalizeSalary(amount: number, currency: CurrencyCode): number {
  return amount * CURRENCY_RATES[currency];
}
```

## Configuration Options

### Limiting Available Currencies

You can restrict which currencies are available in your job board by configuring the `allowedCurrencies` option in your `config/config.ts` file:

```typescript
currency: {
  // Default currency code used when no currency is specified
  defaultCurrency: "USD",
  
  // Allowed currencies for job listings
  // Set to null to allow all currencies, or specify a subset
  allowedCurrencies: ["USD", "EUR", "GBP", "USDT", "BTC", "ETH"],
},
```

When `allowedCurrencies` is:
- `null`: All supported currencies are allowed
- An array: Only the specified currencies will be available

### Setting a Default Currency

The `defaultCurrency` option specifies which currency to use when no currency is provided:

```typescript
currency: {
  defaultCurrency: "EUR", // Changes default from USD to EUR
  // ...
},
```

### Pricing Page Currency

For your pricing page, you can configure the display currency:

```typescript
pricing: {
  // Other pricing configuration...
  
  // Currency for pricing display
  currencySymbol: "€", // Euro symbol
},
```

## Setting Up in Airtable

In your Airtable base, you need a `salary_currency` field to store the currency for each job:

### Field Configuration

1. Create a `salary_currency` field with type "Single select"
2. Add options for each currency you want to support
3. Set a default value (typically "USD")

### Recommended Format

The recommended format for currency options in Airtable is:

```
USD (United States Dollar)
EUR (Euro)
GBP (British Pound Sterling)
BTC (Bitcoin)
```

This format:
- Is user-friendly for job posters
- Will be correctly parsed by Bordful
- Provides context about each currency

### Processing Logic

Bordful parses currency options with these rules:

1. If the format is "CODE (Name)", it extracts the code
2. If the format is just "CODE", it uses that directly
3. If the format is a full name, it looks up the corresponding code

## Extending Currency Support

To add a new currency to the system:

1. Add the currency code to the `CurrencyCode` type in `lib/constants/currencies.ts`
2. Add the currency to the `CURRENCY_CODES` array
3. Add currency details to the `CURRENCIES` array
4. Add an exchange rate to the `CURRENCY_RATES` object

Example for adding a new currency:

```typescript
// 1. Add to CurrencyCode type
export type CurrencyCode = 
  | "USD" 
  | "EUR" 
  // ... existing currencies
  | "XYZ"; // Your new currency

// 2. Add to CURRENCY_CODES array
export const CURRENCY_CODES: CurrencyCode[] = [
  "USD",
  "EUR",
  // ... existing currencies
  "XYZ", // Your new currency
];

// 3. Add to CURRENCIES array
export const CURRENCIES: Currency[] = [
  // ... existing currencies
  { name: "XYZ Coin", symbol: "X", code: "XYZ", needsSpace: false },
];

// 4. Add to CURRENCY_RATES object
export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  // ... existing currencies
  USD: 1.00,
  XYZ: 0.5, // Exchange rate relative to USD
};
```

## Best Practices

### Currency Selection

- Limit available currencies to those most relevant to your audience
- Always include major international currencies (USD, EUR, GBP)
- Consider including cryptocurrencies if targeting tech or remote roles

### Implementation Tips

- Keep exchange rates updated periodically for better sorting accuracy
- Use clear labels for cryptocurrencies to avoid confusion
- Add context for unusual currencies in your interface

### Real-time Exchange Rates

For accurate, real-time currency conversion, consider:

1. Integrating with a currency exchange rate API
2. Updating rates on a regular schedule (daily/weekly)
3. Storing the latest rates in your database or cache

## Related Documentation

- [Configuration Guide](/docs/getting-started/configuration.md)
- [Salary Structure](/docs/reference/salary-structure.md)
- [Airtable Setup Guide](/docs/getting-started/airtable-setup.md) 