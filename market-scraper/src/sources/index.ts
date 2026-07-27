import type { SourceFn } from '../types.js';
import { scrapeIshopping } from './ishopping.js';
import { scrapePriceoye } from './priceoye.js';
import { scrapeShophive } from './shophive.js';
import { scrapeTelemart } from './telemart.js';

// Plain HTTP sources - no browser automation needed.
export const HTTP_SOURCES: SourceFn[] = [scrapePriceoye, scrapeTelemart, scrapeShophive];

// Browser-automation sources (CloakBrowser) - for sites that block plain HTTP.
// iShopping.pk sits behind Cloudflare (Cf-Mitigated: challenge on plain fetch);
// CloakBrowser's stealth Chromium passes the challenge. Daraz and other harder
// targets can land here too.
export const BROWSER_SOURCES: SourceFn[] = [scrapeIshopping];
