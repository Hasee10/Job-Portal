import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugifyHeading } from '@/lib/content/guide-content';

// Mirrors extractGuideHeadings() in lib/content/guide-content.ts - the id
// assigned here must match what the server-side TOC extraction generates,
// or the "jump to section" links silently do nothing.
function flattenToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join('');
  if (
    node &&
    typeof node === 'object' &&
    'props' in node &&
    node.props &&
    typeof node.props === 'object' &&
    'children' in node.props
  ) {
    return flattenToText(node.props.children as ReactNode);
  }
  return '';
}

export function GuideContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children, ...props }) => (
          <h2
            className="mt-8 mb-3 scroll-mt-24 font-semibold text-xl text-zinc-900 first:mt-0 dark:text-zinc-50"
            id={slugifyHeading(flattenToText(children))}
            {...props}
          >
            {children}
          </h2>
        ),
        h3: ({ ...props }) => (
          <h3
            className="mt-6 mb-2 font-semibold text-lg text-zinc-900 dark:text-zinc-50"
            {...props}
          />
        ),
        p: ({ ...props }) => (
          <p
            className="my-3 text-[15px] text-zinc-700 leading-relaxed dark:text-zinc-300"
            {...props}
          />
        ),
        strong: ({ ...props }) => (
          <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
        ),
        ul: ({ ...props }) => (
          <ul className="my-3 ml-5 list-disc space-y-1.5 text-[15px] text-zinc-700 dark:text-zinc-300" {...props} />
        ),
        ol: ({ ...props }) => (
          <ol className="my-3 ml-5 list-decimal space-y-1.5 text-[15px] text-zinc-700 dark:text-zinc-300" {...props} />
        ),
        a: ({ href, ...props }) =>
          href ? (
            <a
              className="text-cyan-700 underline decoration-cyan-700/30 underline-offset-2 hover:decoration-cyan-700 dark:text-cyan-400 dark:decoration-cyan-400/30 dark:hover:decoration-cyan-400"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
              {...props}
            />
          ) : (
            <span {...props} />
          ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
}
