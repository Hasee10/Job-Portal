'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { useToast } from '@/hooks/use-toast';
import { resolveColor } from '@/lib/utils/colors';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border p-6 text-center">
        <p className="text-red-600 text-sm">
          This reset link is missing its token. Request a new one from the{' '}
          <a className="underline" href="/forgot-password">
            forgot password
          </a>{' '}
          page.
        </p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
        <p className="text-green-800 text-sm dark:text-green-400">
          Your password has been reset. You can now sign in.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/employers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'This reset link is invalid or has expired.');
        return;
      }

      setIsSuccess(true);
      toast({
        title: 'Password reset',
        description: 'You can now sign in with your new password.',
      });
      setTimeout(() => router.push('/sign-in'), 2000);
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="password">
            New password
          </Label>
          <Input
            disabled={isSubmitting}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
          {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </div>
  );
}
