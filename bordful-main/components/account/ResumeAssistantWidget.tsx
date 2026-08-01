'use client';

import { useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResumeContent } from '@/lib/jobs/resume-actions';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Floating assistant for the Resume builder page: drafts/improves a summary,
// answers questions about how the builder/tailoring feature works, and
// reviews the resume. Rewritten summaries come back as plain text (per the
// route's system prompt) so they can be inserted directly into the form.
export function ResumeAssistantWidget({
  content,
  targetJob,
  onApplySummary,
}: {
  content: ResumeContent;
  targetJob?: { title: string; company: string } | null;
  onApplySummary: (text: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = [
    'Write a summary from my experience',
    'Make my headline stronger',
    'Review my resume for gaps',
    'How does tailoring for a job work?',
  ];

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/seeker/resume-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          draft: { ...content, targetJob: targetJob ?? null },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reach the assistant.');
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach the assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  // Heuristic for "this reply is summary text, not conversation": the
  // system prompt tells the model to answer with ONLY the field text when
  // asked to write/rewrite, and those replies run noticeably longer than a
  // chat answer or FAQ response.
  const looksLikeFieldText = (text: string) => text.length > 120;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col rounded-xl border border-zinc-200 bg-background shadow-xl dark:border-zinc-800 sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                Resume assistant
              </span>
            </div>
            <button
              aria-label="Close assistant"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ask me to write or improve your summary, review your resume, or
                  explain how tailoring works.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      key={s}
                      onClick={() => send(s)}
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                key={i}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
                  )}
                >
                  {m.content}
                  {m.role === 'assistant' && looksLikeFieldText(m.content) && (
                    <div className="mt-2">
                      <Button
                        className="h-7 px-2 text-xs"
                        onClick={() => onApplySummary(m.content)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Use as summary
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <form
            className="flex items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the assistant…"
              value={input}
            />
            <Button disabled={isLoading || !input.trim()} size="icon" type="submit">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        aria-label={isOpen ? 'Close resume assistant' : 'Open resume assistant'}
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen((v) => !v)}
        size="icon"
        type="button"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </Button>
    </div>
  );
}
