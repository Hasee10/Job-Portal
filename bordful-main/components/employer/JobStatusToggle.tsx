"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function JobStatusToggle({
  jobId,
  isActive,
  apiBasePath = "/api/employer/jobs",
}: {
  jobId: string;
  isActive: boolean;
  apiBasePath?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}`, {
        body: JSON.stringify({ action: isActive ? "close" : "reopen" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error();
      }
      toast({ title: isActive ? "Job closed" : "Job reopened" });
      router.refresh();
    } catch {
      toast({ title: "Failed to update job", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      disabled={isSubmitting}
      onClick={handleToggle}
      size="sm"
      variant="outline"
    >
      {isActive ? "Close job" : "Reopen job"}
    </Button>
  );
}
