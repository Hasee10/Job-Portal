import axios from 'axios';
import config from '@/config';
import {
  type EmailProvider,
  EmailProviderError,
  type SubscriberData,
} from '../types';

export class EnchargeProvider implements EmailProvider {
  name = 'encharge';
  private readonly writeKey: string;
  private readonly defaultTags: string;
  private readonly eventName: string;

  constructor() {
    // Get configuration from config file or environment variables
    const enchargeConfig = config.email?.encharge || {};

    this.writeKey =
      enchargeConfig.writeKey || process.env.ENCHARGE_WRITE_KEY || '';
    this.defaultTags = enchargeConfig.defaultTags || 'job-alerts-subscriber';
    this.eventName = enchargeConfig.eventName || 'Job Alert Subscription';
  }

  /**
   * Checked at request time rather than in the constructor: the constructor
   * runs at module-import time, which Next.js also evaluates during
   * production builds (collecting page data for every route that imports
   * this module) - throwing there broke `next build` entirely for any
   * deployment that hadn't set the key yet. Returns true if the caller
   * should short-circuit with a simulated success (local dev, no key).
   */
  private assertConfigured(featureLabel: string): boolean {
    if (!this.writeKey && process.env.NODE_ENV === 'development') {
      return true; // simulate success
    }

    if (!this.writeKey && process.env.NODE_ENV === 'production') {
      // Loud operator signal - flagged as notConfigured so the calling API
      // route returns a clean "temporarily unavailable" instead of a
      // misleading 500 that looks like a code bug.
      console.error(
        `[email/encharge] ENCHARGE_WRITE_KEY is not set - ${featureLabel} ` +
          'is failing. Set it in the deployment environment.'
      );
      throw new EmailProviderError(
        'Encharge write key is required in production',
        'encharge',
        true // notConfigured
      );
    }
    return false;
  }

  private async ingest(payload: Record<string, unknown>): Promise<void> {
    await axios.post(
      `https://ingest.encharge.io/v1/${this.writeKey}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  async subscribe(data: SubscriberData) {
    try {
      if (this.assertConfigured('job-alert subscriptions')) {
        return { success: true };
      }

      await this.ingest({
        name: this.eventName,
        user: {
          email: data.email,
          firstName: data.name?.split(' ')[0] || '',
          lastName: data.name?.split(' ').slice(1).join(' ') || '',
          tags: this.defaultTags,
          ip: data.ip,
        },
        properties: {
          ...data.metadata,
          signupDate: new Date().toISOString(),
          submittedName: data.name || 'Not provided',
        },
        sourceIp: data.ip,
      });

      return { success: true };
    } catch (error) {
      // Preserve an already-typed EmailProviderError (keeps its
      // notConfigured flag) rather than flattening it into a generic one.
      if (error instanceof EmailProviderError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Subscription failed';
      throw new EmailProviderError(errorMessage, 'encharge');
    }
  }

  async sendPasswordReset(data: { email: string; resetUrl: string }) {
    try {
      if (this.assertConfigured('password-reset emails')) {
        return { success: true };
      }

      // Requires a matching automation flow configured in the Encharge
      // dashboard, triggered by this event name, that emails resetUrl to
      // the user - same setup job-alert notifications already rely on for
      // the "Job Alert Subscription" event.
      await this.ingest({
        name: 'Password Reset Requested',
        user: { email: data.email },
        properties: {
          resetUrl: data.resetUrl,
          requestedAt: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email';
      throw new EmailProviderError(errorMessage, 'encharge');
    }
  }
}
