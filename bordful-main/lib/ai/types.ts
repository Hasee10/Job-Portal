export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    // Mirrors EmailProviderError's notConfigured flag - lets API routes
    // return a clean "temporarily unavailable" instead of a generic 500
    // when the operator just hasn't supplied keys yet.
    public notConfigured = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
