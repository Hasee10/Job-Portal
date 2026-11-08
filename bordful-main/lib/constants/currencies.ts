// Currency constants and utilities

// Currency type definition - 50 common currencies
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "JPY"
  | "GBP"
  | "AUD"
  | "CAD"
  | "CHF"
  | "CNY"
  | "SEK"
  | "NZD"
  | "MXN"
  | "SGD"
  | "HKD"
  | "NOK"
  | "KRW"
  | "TRY"
  | "RUB"
  | "INR"
  | "BRL"
  | "ZAR"
  | "PHP"
  | "CZK"
  | "IDR"
  | "MYR"
  | "HUF"
  | "ISK"
  | "BGN"
  | "THB"
  | "ILS"
  | "CLP"
  | "NGN"
  | "COP"
  | "PKR"
  | "BDT"
  | "VND"
  | "EGP"
  | "PEN"
  | "KWD"
  | "SAR"
  | "ARS"
  | "UAH"
  | "RON"
  | "DKK"
  | "PLN"
  | "QAR"
  | "BHD"
  | "OMR"
  | "JOD"
  | "USDT"
  | "USDC"
  | "USDS"
  | "PYUSD"
  | "TUSD"
  | "BTC"
  | "ETH"
  | "XRP"
  | "BNB"
  | "SOL"
  | "ADA"
  | "DOGE"
  | "TRX"
  | "XLM"
  | "AVAX"
  | "SHIB"
  | "LTC"
  | "BCH"
  | "DOT"
  | "XMR";

// Export a list of all currency codes for programmatic use
export const CURRENCY_CODES: CurrencyCode[] = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
  "MXN",
  "SGD",
  "HKD",
  "NOK",
  "KRW",
  "TRY",
  "RUB",
  "INR",
  "BRL",
  "ZAR",
  "PHP",
  "CZK",
  "IDR",
  "MYR",
  "HUF",
  "ISK",
  "BGN",
  "THB",
  "ILS",
  "CLP",
  "NGN",
  "COP",
  "PKR",
  "BDT",
  "VND",
  "EGP",
  "PEN",
  "KWD",
  "SAR",
  "ARS",
  "UAH",
  "RON",
  "DKK",
  "PLN",
  "QAR",
  "BHD",
  "OMR",
  "JOD",
  "USDT",
  "USDC",
  "USDS",
  "PYUSD",
  "TUSD",
  "BTC",
  "ETH",
  "XRP",
  "BNB",
  "SOL",
  "ADA",
  "DOGE",
  "TRX",
  "XLM",
  "AVAX",
  "SHIB",
  "LTC",
  "BCH",
  "DOT",
  "XMR",
];

// Currency information structure
export type Currency = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  needsSpace?: boolean; // Whether to add a space after the currency symbol
};

// Full currency data with names and symbols
export const CURRENCIES: Currency[] = [
  { code: "USD", name: "United States Dollar", needsSpace: false, symbol: "$" },
  { code: "EUR", name: "Euro", needsSpace: false, symbol: "€" },
  { code: "JPY", name: "Japanese Yen", needsSpace: false, symbol: "¥" },
  {
    code: "GBP",
    name: "British Pound Sterling",
    needsSpace: false,
    symbol: "£",
  },
  { code: "AUD", name: "Australian Dollar", needsSpace: false, symbol: "$" },
  { code: "CAD", name: "Canadian Dollar", needsSpace: false, symbol: "$" },
  { code: "CHF", name: "Swiss Franc", needsSpace: true, symbol: "CHF" },
  {
    code: "CNY",
    name: "Chinese Yuan Renminbi",
    needsSpace: false,
    symbol: "¥",
  },
  { code: "SEK", name: "Swedish Krona", needsSpace: false, symbol: "kr" },
  { code: "NZD", name: "New Zealand Dollar", needsSpace: false, symbol: "$" },
  { code: "MXN", name: "Mexican Peso", needsSpace: false, symbol: "$" },
  { code: "SGD", name: "Singapore Dollar", needsSpace: false, symbol: "$" },
  { code: "HKD", name: "Hong Kong Dollar", needsSpace: false, symbol: "$" },
  { code: "NOK", name: "Norwegian Krone", needsSpace: false, symbol: "kr" },
  { code: "KRW", name: "South Korean Won", needsSpace: false, symbol: "₩" },
  { code: "TRY", name: "Turkish Lira", needsSpace: false, symbol: "₺" },
  { code: "RUB", name: "Russian Ruble", needsSpace: false, symbol: "₽" },
  { code: "INR", name: "Indian Rupee", needsSpace: false, symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", needsSpace: false, symbol: "R$" },
  { code: "ZAR", name: "South African Rand", needsSpace: false, symbol: "R" },
  { code: "PHP", name: "Philippine Peso", needsSpace: false, symbol: "₱" },
  { code: "CZK", name: "Czech Koruna", needsSpace: true, symbol: "Kč" },
  { code: "IDR", name: "Indonesian Rupiah", needsSpace: true, symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", needsSpace: true, symbol: "RM" },
  { code: "HUF", name: "Hungarian Forint", needsSpace: true, symbol: "Ft" },
  { code: "ISK", name: "Icelandic Krona", needsSpace: false, symbol: "kr" },
  { code: "BGN", name: "Bulgarian Lev", needsSpace: true, symbol: "лв" },
  { code: "THB", name: "Thai Baht", needsSpace: false, symbol: "฿" },
  { code: "ILS", name: "Israeli New Shekel", needsSpace: false, symbol: "₪" },
  { code: "CLP", name: "Chilean Peso", needsSpace: false, symbol: "$" },
  { code: "NGN", name: "Nigerian Naira", needsSpace: false, symbol: "₦" },
  { code: "COP", name: "Colombian Peso", needsSpace: false, symbol: "$" },
  { code: "PKR", name: "Pakistani Rupee", needsSpace: true, symbol: "Rs." },
  { code: "BDT", name: "Bangladeshi Taka", needsSpace: true, symbol: "Tk" },
  { code: "VND", name: "Vietnamese Dong", needsSpace: false, symbol: "₫" },
  { code: "EGP", name: "Egyptian Pound", needsSpace: false, symbol: "£" },
  { code: "PEN", name: "Peruvian Sol", needsSpace: true, symbol: "S/" },
  { code: "KWD", name: "Kuwaiti Dinar", needsSpace: true, symbol: "د.ك" },
  { code: "SAR", name: "Saudi Riyal", needsSpace: true, symbol: "ر.س" },
  { code: "ARS", name: "Argentine Peso", needsSpace: false, symbol: "$" },
  { code: "UAH", name: "Ukrainian Hryvnia", needsSpace: false, symbol: "₴" },
  { code: "RON", name: "Romanian Leu", needsSpace: true, symbol: "lei" },
  { code: "DKK", name: "Danish Krone", needsSpace: false, symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", needsSpace: false, symbol: "zł" },
  { code: "QAR", name: "Qatari Riyal", needsSpace: true, symbol: "ر.ق" },
  { code: "BHD", name: "Bahraini Dinar", needsSpace: true, symbol: ".د.ب" },
  { code: "OMR", name: "Omani Rial", needsSpace: true, symbol: "ر.ع." },
  { code: "JOD", name: "Jordanian Dinar", needsSpace: false, symbol: "JD" },
  { code: "USDT", name: "Tether USD", needsSpace: false, symbol: "$" },
  { code: "USDC", name: "USD Coin", needsSpace: false, symbol: "$" },
  { code: "USDS", name: "USDS Stablecoin", needsSpace: false, symbol: "$" },
  { code: "PYUSD", name: "PayPal USD", needsSpace: false, symbol: "$" },
  { code: "TUSD", name: "True USD", needsSpace: false, symbol: "$" },
  { code: "BTC", name: "Bitcoin", needsSpace: false, symbol: "₿" },
  { code: "ETH", name: "Ethereum", needsSpace: false, symbol: "Ξ" },
  { code: "XRP", name: "Ripple", needsSpace: false, symbol: "$" },
  { code: "BNB", name: "BNB", needsSpace: false, symbol: "$" },
  { code: "SOL", name: "Solana", needsSpace: false, symbol: "$" },
  { code: "ADA", name: "Cardano", needsSpace: false, symbol: "$" },
  { code: "DOGE", name: "Dogecoin", needsSpace: false, symbol: "$" },
  { code: "TRX", name: "Tron", needsSpace: false, symbol: "$" },
  { code: "XLM", name: "Stellar", needsSpace: false, symbol: "$" },
  { code: "AVAX", name: "Avalanche", needsSpace: false, symbol: "$" },
  { code: "SHIB", name: "Shiba Inu", needsSpace: false, symbol: "$" },
  { code: "LTC", name: "Litecoin", needsSpace: false, symbol: "$" },
  { code: "BCH", name: "Bitcoin Cash", needsSpace: false, symbol: "$" },
  { code: "DOT", name: "Polkadot", needsSpace: false, symbol: "$" },
  { code: "XMR", name: "Monero", needsSpace: false, symbol: "$" },
];

// Currency lookup map for quick access
export const CURRENCY_MAP: Record<CurrencyCode, Currency> = CURRENCIES.reduce(
  (acc, currency) => {
    acc[currency.code] = currency;
    return acc;
  },
  {} as Record<CurrencyCode, Currency>
);

// Get currency by code
export function getCurrencyByCode(code: string): Currency | undefined {
  if (CURRENCY_CODES.includes(code as CurrencyCode)) {
    return CURRENCY_MAP[code as CurrencyCode];
  }
}

// Get currency by name
export function getCurrencyByName(name: string): Currency | undefined {
  return CURRENCIES.find(
    (currency) => currency.name.toLowerCase() === name.toLowerCase()
  );
}

// Get symbol for currency code
export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCY_MAP[code]?.symbol || code;
}

// Format a currency symbol with proper spacing based on currency configuration
export function formatCurrencySymbol(code: CurrencyCode): string {
  const currency = CURRENCY_MAP[code];
  if (!currency) {
    return code;
  }

  const symbol = currency.symbol;
  const needsSpace = currency.needsSpace ?? false;

  return needsSpace ? `${symbol} ` : symbol;
}

// Approximate exchange rates for normalizing salaries
// These are simplified rates for comparison purposes only
// In a production app, you would use a real-time exchange rate API
export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  ADA: 0.73,
  ARS: 0.0011,
  AUD: 0.69,
  AVAX: 19.22,
  BCH: 336,
  BDT: 0.0091,
  BGN: 0.56,
  BHD: 2.65,
  BNB: 604,
  BRL: 0.18,
  BTC: 83_000,
  CAD: 0.75,
  CHF: 1.09,
  CLP: 0.0011,
  CNY: 0.14,
  COP: 0.000_25,
  CZK: 0.044,
  DKK: 0.148,
  DOGE: 0.17,
  DOT: 4.29,
  EGP: 0.021,
  ETH: 1900,
  EUR: 1.1,
  GBP: 1.28,
  HKD: 0.13,
  HUF: 0.0029,
  IDR: 0.000_067,
  ILS: 0.287,
  INR: 0.012,
  ISK: 0.0072,
  JOD: 1.41,
  JPY: 0.007,
  KRW: 0.000_75,
  KWD: 3.26,
  LTC: 91.88,
  MXN: 0.051,
  MYR: 0.22,
  NGN: 0.000_68,
  NOK: 0.102,
  NZD: 0.63,
  OMR: 2.6,
  PEN: 0.27,
  PHP: 0.018,
  PKR: 0.0036,
  PLN: 0.2459,
  PYUSD: 1.0, // PayPal USD is pegged to USD
  QAR: 0.27,
  RON: 0.22,
  RUB: 0.011,
  SAR: 0.27,
  SEK: 0.1,
  SGD: 0.738,
  SHIB: 0.000_013_01,
  SOL: 134,
  THB: 0.029,
  TRX: 0.21,
  TRY: 0.07,
  TUSD: 1.0, // True USD is pegged to USD
  UAH: 0.025,
  USD: 1.0, // Base currency
  USDC: 1.0, // USD Coin is pegged to USD
  USDS: 1.0, // USDS is pegged to USD
  USDT: 1.0, // Tether is pegged to USD
  VND: 0.000_04,
  XLM: 0.27,
  XMR: 213,
  XRP: 2.36,
  ZAR: 0.059,
};
