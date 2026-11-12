"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { ApplyModal } from "@/components/jobs/ApplyModal";
import { Button } from "@/components/ui/button";

export function ApplyButton({
  jobId,
  jobTitle,
  applyUrl,
  acceptsApplications,
  size = "xs",
  fullWidth = false,
}: {
  jobId: string;
  jobTitle: string;
  applyUrl: string;
  acceptsApplications: boolean;
  size?: "xs" | "sm" | "default" | "lg";
  fullWidth?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  if (!acceptsApplications && !applyUrl) {
    return (
      <Button
        disabled
        size={size}
        className={fullWidth ? "w-full" : "w-full sm:w-auto"}
      >
        Applications unavailable
      </Button>
    );
  }
  if (!acceptsApplications) {
    return (
      <Button
        asChild
        className={fullWidth ? "w-full gap-1.5" : "w-full gap-1.5 sm:w-auto"}
        size={size}
        style={{ backgroundColor: "#086b85" }}
        variant="primary"
      >
        <a href={applyUrl} rel="noopener noreferrer" target="_blank">
          Apply Now
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </Button>
    );
  }

  return (
    <>
      <Button
        className={fullWidth ? "w-full gap-1.5" : "w-full gap-1.5 sm:w-auto"}
        onClick={() => setShowModal(true)}
        size={size}
        style={{ backgroundColor: "#086b85" }}
        variant="primary"
      >
        Apply Now
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      {showModal && (
        <ApplyModal
          jobId={jobId}
          jobTitle={jobTitle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
