import config from '@/config';
import { EnchargeProvider } from './providers/encharge';
import { EmailProviderError } from './types';

// Only Encharge is implemented today, even though config/email accepts other
// provider names (mailchimp, convertkit, sendgrid) for forward compatibility.
// Selecting one of those without an implementation used to silently fall
// back to Encharge; fail loudly instead so a misconfigured EMAIL_PROVIDER
// doesn't send subscribers to the wrong service.
function createEmailProvider() {
  const providerName = config.email?.provider || 'encharge';

  if (providerName === 'encharge') {
    return new EnchargeProvider();
  }

  throw new EmailProviderError(
    `Email provider "${providerName}" is not implemented yet. Only "encharge" is currently supported - set EMAIL_PROVIDER=encharge or implement lib/email/providers/${providerName}.ts.`,
    providerName
  );
}

// Export a pre-configured instance of the configured email provider
export const emailProvider = createEmailProvider();

// Export types for convenience
export * from './types';
