'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import config from '@/config';
import { useToast } from '@/hooks/use-toast';
import { resolveColor } from '@/lib/utils/colors';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function SignUpForm() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const { toast } = useToast();
  const router = useRouter();

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email || !EMAIL_REGEX.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/employers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, companyName }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sign up failed.');
      }

      // Immediately sign in with the same credentials so the new employer
      // doesn't have to fill the sign-in form right after signing up.
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast({
          title: 'Account created',
          description: 'Please sign in with your new account.',
        });
        router.push('/sign-in');
        return;
      }

      toast({
        title: 'Welcome to Joblo',
        description: 'Your employer account is ready.',
      });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong.',
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
            <Label className="font-medium text-sm" htmlFor="companyName">
              Company name
            </Label>
            <Input
              disabled={isSubmitting}
              id="companyName"
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company"
              type="text"
              value={companyName}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="email">
              Email *
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
            {errors.email && (
              <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="password">
              Password *
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
            {errors.password && (
              <p className="mt-1 text-red-500 text-sm">{errors.password}</p>
            )}
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting}
          style={{ backgroundColor: resolveColor(config.ui.primaryColor) }}
          type="submit"
          variant="primary"
        >
          {isSubmitting ? 'Creating account...' : 'Create employer account'}
        </Button>
      </form>
    </div>
  );
}
