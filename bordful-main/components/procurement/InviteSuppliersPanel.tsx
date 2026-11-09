"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { OrganizationSummary } from "@/lib/procurement/connection-actions";
import type { SupplierInvitation } from "@/lib/procurement/organization-rfq-actions";

// Only suppliers this buyer has already approved are offered. The server
// re-checks that approval, so an id added by hand is refused there too.

export function InviteSuppliersPanel({
  approvedSuppliers,
  canManage,
  invitations,
  isDraft,
  organizationId,
  requestId,
}: {
  approvedSuppliers: OrganizationSummary[];
  canManage: boolean;
  invitations: SupplierInvitation[];
  isDraft: boolean;
  organizationId: string;
  requestId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const inviteLabel = (() => {
    if (isSending) {
      return "Inviting";
    }
    return isDraft ? "Invite and publish" : "Invite";
  })();

  const invitedIds = new Set(invitations.map((i) => i.supplierOrgId));
  const available = approvedSuppliers.filter((s) => !invitedIds.has(s.id));

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };

  const handleInvite = async () => {
    if (selected.length === 0) {
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(
        `/api/procurement/organizations/${organizationId}/requests/${requestId}/invitations`,
        {
          body: JSON.stringify({ publish: isDraft, supplierOrgIds: selected }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite suppliers.");
      }
      toast({
        title:
          data.skipped?.length > 0
            ? `Invited ${data.invited.length}. ${data.skipped.length} were not approved suppliers.`
            : `Invited ${data.invited.length}.`,
      });
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Failed to invite suppliers.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
        Invited suppliers
      </h2>

      {invitations.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Nobody has been invited yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {invitations.map((invitation) => (
            <li
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
              key={invitation.supplierOrgId}
            >
              <span className="text-zinc-900 dark:text-zinc-100">
                {invitation.supplierOrgName ?? "A business"}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {invitation.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
            Invite from your approved suppliers
          </h3>
          {available.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {approvedSuppliers.length === 0
                ? "You have not approved any suppliers yet. Connect with a business first."
                : "Every approved supplier has already been invited."}
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {available.map((supplier) => (
                  <li key={supplier.id}>
                    <label
                      className="flex items-center gap-2.5 text-sm"
                      htmlFor={`supplier-${supplier.id}`}
                    >
                      <input
                        checked={selected.includes(supplier.id)}
                        id={`supplier-${supplier.id}`}
                        onChange={() => toggle(supplier.id)}
                        type="checkbox"
                      />
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {supplier.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-4"
                disabled={isSending || selected.length === 0}
                onClick={handleInvite}
                type="button"
              >
                {inviteLabel}
              </Button>
              {isDraft ? (
                <p className="mt-2 text-xs text-zinc-500">
                  This request is still a draft. Inviting will publish it so the
                  suppliers can see it.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
