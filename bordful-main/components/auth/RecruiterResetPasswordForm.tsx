'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import config from '@/config';
import { useToast } from '@/hooks/use-toast';
import { resolveColor } from '@/lib/utils/colors';

export function RecruiterResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Invalid or missing reset link. Request a new one from the{' '}
          <a className="underline" href="/recruiter/forgot-password">forgot password</a> page.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'At least 8 characters required.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/recruiters/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Reset failed.');

      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      router.push('/recruiter/sign-in');
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Please request a new link.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="password">New password</Label>
          <PasswordInput
            disabled={isSubmitting}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            value={password}
          />
        </div>
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="confirm">Confirm new password</Label>
          <PasswordInput
            disabled={isSubmitting}
            id="confirm"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
          />
        </div>
        <Button
          className="w-full"
          disabled={isSubmitting || !password || !confirmPassword}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Updating…' : 'Set new password'}
        </Button>
      </form>
    </div>
  );
}
