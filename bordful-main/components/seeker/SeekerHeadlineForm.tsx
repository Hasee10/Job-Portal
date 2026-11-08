"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function SeekerHeadlineForm({ initial }: { initial: string | null }) {
  const [headline, setHeadline] = useState(initial ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/seeker/inbox", {
        body: JSON.stringify({ headline: headline.trim() || null }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error();
      }
      toast({
        description: "Recruiters will see this on your profile.",
        title: "Headline saved",
      });
    } catch {
      toast({
        description: "Please try again.",
        title: "Failed to save",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="mt-4" onSubmit={handleSubmit}>
      <label
        className="font-medium text-sm text-zinc-700 dark:text-zinc-300"
        htmlFor="seeker-headline"
      >
        Professional headline
      </label>
      <p className="mt-0.5 text-xs text-zinc-400">
        A short phrase shown to recruiters — e.g. &ldquo;Senior backend engineer
        &middot; Python &middot; 5 yrs exp&rdquo;
      </p>
      <div className="mt-2 flex gap-2">
        <Input
          id="seeker-headline"
          maxLength={160}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Full-stack engineer · React · Node.js"
          value={headline}
        />
        <Button disabled={isSaving} size="sm" type="submit">
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{headline.length}/160</p>
    </form>
  );
}
