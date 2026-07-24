const WORDS_PER_MINUTE = 200;

// Derived straight from the real stored content length - not an editorial
// guess, so it stays honest as guides are added/edited.
export function estimateReadMinutes(content: string): number {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

export type GuideHeading = {
  id: string;
  text: string;
};

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Pulls "## Heading" lines out of the guide's markdown for a table of
// contents - matches exactly what remark/react-markdown will render as
// <h2> elements, since both just look for `## ` at the start of a line.
export function extractGuideHeadings(content: string): GuideHeading[] {
  const matches = content.match(/^## (.+)$/gm) ?? [];
  return matches.map((line) => {
    const text = line.replace(/^## /, '').trim();
    return { id: slugifyHeading(text), text };
  });
}
