/**
 * Basic subscriber data structure
 */
export type SubscriberData = {
  email: string;
  name?: string;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>; // More specific type for metadata
};

/**
 * Common interface for all email providers
 */
export type EmailProvider = {
  name: string;
  subscribe(data: SubscriberData): Promise<{
    success: boolean;
    error?: string;
  }>;
};

/**
 * Custom error class for email provider errors
 */
export class EmailProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    // Distinguishes "the provider isn't set up on this deployment" (an
    // operator misconfiguration - the API route can return a clean
    // "temporarily unavailable" instead of a generic 500) from a genuine
    // runtime failure talking to the provider.
    public notConfigured = false
  ) {
    super(message);
    this.name = 'EmailProviderError';
  }
}
