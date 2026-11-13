"use client";

import { ExistingAccountOptions } from "@/components/auth/ExistingAccountOptions";
import { safeInternalRedirect } from "@/lib/utils/safe-redirect";
import { existingAccountHref } from "@/lib/auth/procurement-onboarding";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import config from "@/config";
import { useToast } from "@/hooks/use-toast";
import { resolveColor } from "@/lib/utils/colors";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function SignUpForm({
  callbackUrl: requestedCallback = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const callbackUrl = safeInternalRedirect(requestedCallback, "/dashboard");
  const [duplicateAccount, setDuplicateAccount] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const { toast } = useToast();
  const router = useRouter();

  const validate = () => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    if (!(email && EMAIL_REGEX.test(email))) {
      newErrors.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setDuplicateAccount(false);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/employers/signup", {
        body: JSON.stringify({ companyName, email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok && result.code === "already_authenticated") {
        router.push(callbackUrl);
        router.refresh();
        return;
      }
      if (!response.ok && result.code === "email_taken") {
        setDuplicateAccount(true);
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "Sign up failed.");
      }

      // Immediately sign in with the same credentials so the new employer
      // doesn't have to fill the sign-in form right after signing up.
      const signInResult = await signIn("credentials", {
        accountType: "employer",
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast({
          description: "Please sign in with your new account.",
          title: "Account created",
        });
        router.push(existingAccountHref("/sign-in", callbackUrl));
        return;
      }
      toast({
        description: "Your business account is ready.",
        title: "Welcome to Caliber",
      });
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast({
        className: "bg-destructive border border-red-600 shadow-md",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        title: "Sign up failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border p-6">
      {duplicateAccount && (
        <div role="alert" className="mb-5">
          <p className="text-sm">
            We couldn’t create an account with this email. If you already use
            Caliber, sign in using your original account.
          </p>
          <ExistingAccountOptions callbackUrl={callbackUrl} />
        </div>
      )}
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
            <PasswordInput
              disabled={isSubmitting}
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              value={password}
            />
            {errors.password && (
              <p className="mt-1 text-red-500 text-sm">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="confirmPassword">
              Confirm password *
            </Label>
            <PasswordInput
              disabled={isSubmitting}
              id="confirmPassword"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              value={confirmPassword}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-red-500 text-sm">
                {errors.confirmPassword}
              </p>
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
          {isSubmitting ? "Creating account..." : "Create business account"}
        </Button>
      </form>
    </div>
  );
}
