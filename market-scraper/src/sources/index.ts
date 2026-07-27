import type { SourceFn } from '../types.js';
import { scrapePriceoye } from './priceoye.js';
import { scrapeShophive } from './shophive.js';
import { scrapeTelemart } from './telemart.js';

// Plain HTTP sources - no browser automation needed.
export const HTTP_SOURCES: SourceFn[] = [scrapePriceoye, scrapeTelemart, scrapeShophive];

// Browser-automation sources (CloakBrowser) - none yet. Daraz and other
// Cloudflare-protected sources land here in a later phase.
export const BROWSER_SOURCES: SourceFn[] = [];
