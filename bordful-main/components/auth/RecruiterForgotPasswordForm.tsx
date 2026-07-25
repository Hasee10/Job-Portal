'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { resolveColor } from '@/lib/utils/colors';

export function RecruiterForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/recruiters/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">Check your inbox</p>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          If a recruiter account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="email">Email</Label>
          <Input
            disabled={isSubmitting}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.com"
            required
            type="email"
            value={email}
          />
        </div>
        <Button
          className="w-full"
          disabled={isSubmitting || !email}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  );
}
