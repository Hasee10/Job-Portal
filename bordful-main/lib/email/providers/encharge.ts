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

  async subscribe(data: SubscriberData) {
    try {
      // In development without a key, simulate success
      if (!this.writeKey && process.env.NODE_ENV === 'development') {
        return { success: true };
      }

      // Checked here (at request time) rather than in the constructor:
      // the constructor runs at module-import time, which Next.js also
      // evaluates during production builds (collecting page data for
      // /api/subscribe) - throwing there broke `next build` entirely for
      // any deployment that hadn't set the key yet, even with job alerts
      // disabled in config.
      if (!this.writeKey && process.env.NODE_ENV === 'production') {
        // Loud operator signal - job alerts are enabled in config but the
        // key was never set on this deployment. Flagged as notConfigured so
        // the API route returns a clean "temporarily unavailable" instead of
        // a misleading 500 that looks like a code bug.
        console.error(
          '[email/encharge] ENCHARGE_WRITE_KEY is not set - job-alert ' +
            'subscriptions are failing. Set it in the deployment environment ' +
            'or disable jobAlerts in config.'
        );
        throw new EmailProviderError(
          'Encharge write key is required in production',
          'encharge',
          true // notConfigured
        );
      }

      // Format the payload for Encharge
      const payload = {
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
      };

      // Make the API call to Encharge
      await axios.post(
        `https://ingest.encharge.io/v1/${this.writeKey}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

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
}
