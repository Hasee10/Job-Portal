'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { resolveColor } from '@/lib/utils/colors';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/employers/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      // Always show the same generic message, success or not - the API
      // itself never reveals whether the email is registered.
      setMessage(
        result.message ||
          "If an account exists for that email, we've sent a password reset link."
      );
    } catch {
      setMessage('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (message) {
    return (
      <div className="mx-auto w-full max-w-md rounded-lg border bg-green-50 p-6 text-center">
        <p className="text-green-800 text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="font-medium text-sm" htmlFor="email">
            Email
          </Label>
          <Input
            disabled={isSubmitting}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </div>
  );
}
