// Shared retry-with-backoff for tender sources. Neither ted.ts nor ppra.ts
// retried a transient failure before this - a single network blip or a
// momentary 5xx/429 from either source lost that entire day's capture for
// it, since the daily cron only runs once. Exponential backoff with jitter,
// same shape as the reference technique in ai-job-search's linkedin-search
// CLI (httpFetch there retries 429/5xx up to 6 times).
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { maxRetries?: number; label: string }
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 4;
  let delay = 800;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e) {
      if (attempt === maxRetries) throw e;
      console.warn(`[${opts.label}] network error (attempt ${attempt + 1}/${maxRetries + 1}):`, (e as Error).message);
      await sleep(delay + jitter());
      delay = Math.min(delay * 2, 10_000);
      continue;
    }

    if (res.status !== 429 && res.status < 500) return res;
    if (attempt === maxRetries) return res;

    console.warn(`[${opts.label}] HTTP ${res.status} (attempt ${attempt + 1}/${maxRetries + 1}), retrying…`);
    await sleep(delay + jitter());
    delay = Math.min(delay * 2, 10_000);
  }

  // Unreachable - the loop always returns or throws - but keeps TypeScript
  // satisfied that every path returns a Response.
  throw new Error(`[${opts.label}] retry loop exited unexpectedly`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(): number {
  return Math.floor(Math.random() * 400);
}
