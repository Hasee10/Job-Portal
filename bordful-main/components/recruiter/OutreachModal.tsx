'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { OptInCandidate } from '@/lib/jobs/candidate-outreach-actions';

export function OutreachModal({
  candidate,
  onClose,
  onSent,
}: {
  candidate: OptInCandidate;
  onClose: () => void;
  onSent: (seekerId: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const displayName = candidate.name || candidate.email.split('@')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/recruiter/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seekerId: candidate.seekerId, message: message.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send.');

      toast({ title: 'Message sent', description: `Your outreach to ${displayName} is on its way.` });
      onSent(candidate.seekerId);
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to send',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
          Message {displayName}
        </h2>
        {candidate.headline && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{candidate.headline}</p>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="outreach-msg">
              Your message
            </label>
            <Textarea
              id="outreach-msg"
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${displayName}, I came across your profile and think you'd be a great fit for…`}
              rows={5}
              value={message}
            />
            <p className="text-xs text-zinc-400">{message.length}/2000</p>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={isSubmitting || !message.trim()}
              type="submit"
            >
              {isSubmitting ? 'Sending…' : 'Send message'}
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
