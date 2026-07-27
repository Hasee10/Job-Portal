import type { SourceFn } from '../types.js';
import { scrapeGoto } from './goto.js';
import { scrapeIshopping } from './ishopping.js';
import { scrapePriceoye } from './priceoye.js';
import { scrapeShophive } from './shophive.js';
import { scrapeTelemart } from './telemart.js';

// Plain HTTP sources - no browser automation needed.
export const HTTP_SOURCES: SourceFn[] = [scrapePriceoye, scrapeTelemart, scrapeShophive];

// Browser-automation sources (CloakBrowser) - for sites that block plain HTTP
// or need real TLS/session handling. iShopping.pk sits behind Cloudflare
// (Cf-Mitigated: challenge on plain fetch). Goto.com.pk has an expired TLS
// cert (needs ignoreHTTPSErrors) and thin/inconsistent category inventory -
// see scrapeGoto's category list.
export const BROWSER_SOURCES: SourceFn[] = [scrapeIshopping, scrapeGoto];
