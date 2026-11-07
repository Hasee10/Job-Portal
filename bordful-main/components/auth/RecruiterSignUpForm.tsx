"use client";

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

export function RecruiterSignUpForm() {
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const router = useRouter();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) {
      e.name = "Your name is required.";
    }
    if (!(email && EMAIL_REGEX.test(email))) {
      e.email = "Enter a valid email address.";
    }
    if (password.length < 8) {
      e.password = "Password must be at least 8 characters.";
    }
    if (confirmPassword !== password) {
      e.confirmPassword = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/recruiters/signup", {
        body: JSON.stringify({ agency, email, name, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Sign up failed.");
      }

      const signInResult = await signIn("credentials", {
        accountType: "recruiter",
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast({ description: "Please sign in.", title: "Account created" });
        router.push("/recruiter/sign-in");
        return;
      }

      toast({
        description: "Your recruiter account is ready.",
        title: `Welcome to ${config.title}`,
      });
      router.push("/recruiter/dashboard");
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
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="name">
              Full name *
            </Label>
            <Input
              disabled={isSubmitting}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              type="text"
              value={name}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-medium text-sm" htmlFor="agency">
              Agency / Company{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Input
              disabled={isSubmitting}
              id="agency"
              onChange={(e) => setAgency(e.target.value)}
              placeholder="e.g. TalentBridge Recruiting"
              type="text"
              value={agency}
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
              placeholder="you@agency.com"
              required
              type="email"
              value={email}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
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
              <p className="text-red-500 text-sm">{errors.password}</p>
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
              <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
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
          {isSubmitting ? "Creating account..." : "Create recruiter account"}
        </Button>
      </form>
    </div>
  );
}
