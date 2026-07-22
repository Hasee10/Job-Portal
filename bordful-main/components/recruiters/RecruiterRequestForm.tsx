'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function RecruiterRequestForm({
  isSeeker,
  recruiterId = null,
}: {
  isSeeker: boolean;
  recruiterId?: string | null;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isSeeker) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <a className="underline" href="/account/sign-in">
          Sign in
        </a>{' '}
        as a job seeker to request a recruiter match.
      </p>
    );
  }

  if (submitted) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Thanks - we&apos;ve logged your request and a recruiter will follow
        up.
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/seeker/recruiter-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), recruiterId }),
      });
      if (!response.ok) throw new Error('Failed to submit request.');
      setSubmitted(true);
    } catch {
      toast({
        title: 'Could not submit request',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Textarea
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What kind of role and companies are you looking for?"
        rows={3}
        value={message}
      />
      <Button disabled={isSubmitting || !message.trim()} size="sm" type="submit">
        {isSubmitting ? 'Sending...' : 'Request a recruiter match'}
      </Button>
    </form>
  );
}
