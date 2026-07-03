/**
 * Safely serialize data for injection into a `<script type="application/ld+json">`
 * tag via dangerouslySetInnerHTML.
 *
 * JSON.stringify does not escape `<`, so a value containing a literal
 * "</script>" (e.g. a job title or description pulled in from an external,
 * untrusted job board API) would prematurely close the script tag and let an
 * attacker inject arbitrary HTML/script into the page. Escaping `<` to its
 * unicode form neutralizes that without changing the parsed JSON value.
 */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
