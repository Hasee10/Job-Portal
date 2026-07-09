'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { useToast } from '@/hooks/use-toast';
import { resolveColor } from '@/lib/utils/colors';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Deliberately generic - never reveal whether the email exists,
        // only that the password/existing-email pair didn't match.
        toast({
          title: 'Sign in failed',
          description: 'Invalid email or password.',
          variant: 'destructive',
          className: 'bg-destructive border border-red-600 shadow-md',
        });
        return;
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast({
        title: 'Sign in failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border p-6">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm" htmlFor="password">
                Password
              </Label>
              <a
                className="text-xs text-zinc-600 underline hover:no-underline"
                href="/forgot-password"
              >
                Forgot password?
              </a>
            </div>
            <Input
              disabled={isSubmitting}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              type="password"
              value={password}
            />
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
