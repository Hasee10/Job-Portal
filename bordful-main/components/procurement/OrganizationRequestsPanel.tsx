"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ProcurementRequest } from "@/lib/procurement/request-actions";

// Buyer-side list of this organization's own procurement requests, plus the
// form that creates one. Creation is owner/admin only and the server
// re-checks that - canCreate here only decides whether the form is shown.

export function OrganizationRequestsPanel({
  canCreate,
  organizationId,
  requests,
}: {
  canCreate: boolean;
  organizationId: string;
  requests: ProcurementRequest[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(title.trim() && category.trim() && description.trim())) {
      toast({
        title: "Title, category and description are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/procurement/organizations/${organizationId}/requests`,
        {
          body: JSON.stringify({
            category,
            description,
            responseDeadline: deadline
              ? new Date(deadline).toISOString()
              : null,
            title,
            type: "rfq",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create the request.");
      }
      toast({ title: "Request created as a draft." });
      router.push(
        `/procurement/organizations/${organizationId}/requests/${data.request.id}`
      );
      router.refresh();
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Failed to create the request.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
          Your requests
        </h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No procurement requests yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  href={`/procurement/organizations/${organizationId}/requests/${request.id}`}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {request.title}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {request.type.toUpperCase()} &middot; {request.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canCreate ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
            New request
          </h2>
          <p className="mt-1 mb-5 text-sm text-zinc-600 dark:text-zinc-400">
            Created as a draft. Nobody sees it until you invite suppliers and
            publish it.
          </p>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="rfq-title">
                Title
              </label>
              <Input
                id="rfq-title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="20 height-adjustable office desks"
                required
                value={title}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="rfq-category">
                Category
              </label>
              <Input
                id="rfq-category"
                onChange={(e) => setCategory(e.target.value)}
                placeholder="office furniture"
                required
                value={category}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="rfq-description">
                Requirements
              </label>
              <Textarea
                id="rfq-description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quantity, specification, delivery location and any standards that apply."
                required
                rows={4}
                value={description}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="rfq-deadline">
                Response deadline
              </label>
              <Input
                id="rfq-deadline"
                onChange={(e) => setDeadline(e.target.value)}
                type="date"
                value={deadline}
              />
            </div>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Creating" : "Create request"}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
