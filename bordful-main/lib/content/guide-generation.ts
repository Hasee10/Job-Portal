import 'server-only';

import { aiChatCompletion } from '@/lib/ai/provider';
import { slugify } from '@/lib/utils/slugify';
import {
  type DraftGuideInput,
  insertDraftGuide,
  listAllGuideSlugs,
  listPublishedGuidesForStyleReference,
} from './guide-actions';
import { GUIDE_TOPIC_QUEUE, type GuideTopic } from './guide-topics';

const STYLE_REFERENCE_COUNT = 2;
const SUMMARY_MARKER = 'SUMMARY:';
const CONTENT_SEPARATOR = '---';

function buildSystemPrompt(styleExamples: string): string {
  return (
    "You are a career coach writing an original guide for a job portal's " +
    'career guides library. Match the tone and structure of the existing ' +
    'guides below exactly: direct, specific, practical, no generic AI ' +
    'phrasing ("in today\'s competitive job market", "it is important to ' +
    'note"), no fabricated statistics or studies presented as fact, no ' +
    'made-up company names or people. Every claim must be general, ' +
    'defensible career advice, not a specific invented fact.\n\n' +
    'Formatting rules: use "## " markdown headings for each subsection ' +
    '(4-6 of them), plain paragraphs under each, no bold/italic markdown, ' +
    'no bullet lists unless genuinely necessary. Do not include a title ' +
    'heading (the title is handled separately) - start directly with an ' +
    'opening paragraph, then the first "## " subsection.\n\n' +
    'Output format, exactly:\n' +
    `${SUMMARY_MARKER} <one or two sentence summary for a card excerpt>\n` +
    `${CONTENT_SEPARATOR}\n` +
    '<the full guide content>\n\n' +
    'No other commentary before or after either part.\n\n' +
    `Existing guides for style reference:\n\n${styleExamples}`
  );
}

function buildStyleExamples(
  guides: { title: string; content: string }[]
): string {
  return guides
    .map((guide) => `Title: ${guide.title}\n\n${guide.content}`)
    .join('\n\n===\n\n');
}

function parseGeneratedGuide(raw: string): { summary: string; content: string } | null {
  const separatorIndex = raw.indexOf(CONTENT_SEPARATOR);
  if (separatorIndex === -1) return null;

  const summaryPart = raw.slice(0, separatorIndex).trim();
  const content = raw.slice(separatorIndex + CONTENT_SEPARATOR.length).trim();
  const summary = summaryPart.replace(SUMMARY_MARKER, '').trim();

  if (!(summary && content)) return null;
  return { summary, content };
}

async function pickUncoveredTopics(count: number): Promise<GuideTopic[]> {
  const existingSlugs = await listAllGuideSlugs();
  return GUIDE_TOPIC_QUEUE.filter(
    (topic) => !existingSlugs.has(slugify(topic.title))
  ).slice(0, count);
}

export type GenerateDraftGuidesResult = {
  created: { slug: string; title: string }[];
  skippedNoTopics: boolean;
};

// Called by the monthly cron. Picks up to `count` uncovered topics and
// generates a draft for each - failures on one topic don't block the
// others, mirroring the job scraper's per-source isolation pattern.
export async function generateDraftGuides(
  count: number
): Promise<GenerateDraftGuidesResult> {
  const topics = await pickUncoveredTopics(count);
  if (topics.length === 0) {
    return { created: [], skippedNoTopics: true };
  }

  const styleReferenceGuides = await listPublishedGuidesForStyleReference(
    STYLE_REFERENCE_COUNT
  );
  const systemPrompt = buildSystemPrompt(buildStyleExamples(styleReferenceGuides));

  const created: { slug: string; title: string }[] = [];

  for (const topic of topics) {
    try {
      const userPrompt = `Write a guide titled "${topic.title}" (category: ${topic.category}). Focus: ${topic.brief}`;
      const raw = await aiChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.6, maxTokens: 1400 }
      );

      const parsed = parseGeneratedGuide(raw);
      if (!parsed) {
        console.error(
          `[guide-generation] Could not parse output for "${topic.title}"`
        );
        continue;
      }

      const input: DraftGuideInput = {
        slug: slugify(topic.title),
        title: topic.title,
        summary: parsed.summary,
        content: parsed.content,
        category: topic.category,
      };
      const guide = await insertDraftGuide(input);
      created.push({ slug: guide.slug, title: guide.title });
    } catch (error) {
      console.error(
        `[guide-generation] Failed to generate "${topic.title}":`,
        error
      );
    }
  }

  return { created, skippedNoTopics: false };
}
