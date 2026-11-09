"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type {
  InvitableRole,
  OrganizationInvitation,
} from "@/lib/procurement/organization-invitation-actions";
import type {
  OrganizationMember,
  OrganizationRole,
} from "@/lib/procurement/organization-actions";

// Members and invitations for one organization. The server has already
// decided what this person may do and passes it in as canManage and
// isOwner; the checks here only keep the controls honest, and every action
// is authorized again on the server.

const ROLE_LABEL: Record<OrganizationRole, string> = {
  admin: "Admin",
  member: "Member",
  owner: "Owner",
};

async function send(
  url: string,
  method: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    method,
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Something broke."
    );
  }
  return payload;
}

export function MembersPanel({
  organizationId,
  members,
  invitations,
  canManage,
  isOwner,
  viewerMemberId,
}: {
  canManage: boolean;
  invitations: OrganizationInvitation[];
  isOwner: boolean;
  members: OrganizationMember[];
  organizationId: string;
  viewerMemberId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("member");
  const [busy, setBusy] = useState<string | null>(null);
  // Shown once, right after it is created. It is not stored anywhere and no
  // later request can retrieve it, so the only chance to copy it is now.
  const [newToken, setNewToken] = useState<string | null>(null);

  const run = async (key: string, work: () => Promise<void>) => {
    setBusy(key);
    try {
      await work();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Something broke.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const invite = () =>
    run("invite", async () => {
      const payload = await send(
        `/api/procurement/organizations/${organizationId}/invitations`,
        "POST",
        { invitedEmail: email.trim() || null, role }
      );
      setNewToken(payload.token as string);
      setEmail("");
      toast({ title: "Invitation created. Copy the code below." });
      router.refresh();
    });

  const revoke = (invitationId: string) =>
    run(`revoke-${invitationId}`, async () => {
      await send(
        `/api/procurement/organizations/${organizationId}/invitations/${invitationId}`,
        "DELETE"
      );
      toast({ title: "Invitation revoked." });
      router.refresh();
    });

  const changeRole = (member: OrganizationMember, next: OrganizationRole) =>
    run(`role-${member.id}`, async () => {
      await send(
        `/api/procurement/organizations/${organizationId}/members`,
        "PATCH",
        {
          memberId: member.memberId,
          memberType: member.memberType,
          role: next,
        }
      );
      toast({ title: `Role changed to ${ROLE_LABEL[next].toLowerCase()}.` });
      router.refresh();
    });

  const remove = (member: OrganizationMember) =>
    run(`remove-${member.id}`, async () => {
      await send(
        `/api/procurement/organizations/${organizationId}/members`,
        "DELETE",
        { memberId: member.memberId, memberType: member.memberType }
      );
      toast({ title: "Member removed." });
      router.refresh();
    });

  const pending = invitations.filter(
    (invitation) => invitation.status === "pending" && !invitation.isExpired
  );

  return (
    <section className="mt-8">
      <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
        People
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Everyone who can act for this business.
      </p>

      <ul className="mt-3 space-y-2">
        {members.map((entry) => {
          const isSelf = entry.memberId === viewerMemberId;
          return (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
              key={entry.id}
            >
              <span className="text-zinc-600 dark:text-zinc-400">
                {entry.memberType} account{isSelf ? " (you)" : ""}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {ROLE_LABEL[entry.role]}
                </span>
                {isOwner && !isSelf ? (
                  <>
                    <select
                      aria-label="Change role"
                      className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
                      disabled={busy === `role-${entry.id}`}
                      onChange={(event) =>
                        changeRole(
                          entry,
                          event.target.value as OrganizationRole
                        )
                      }
                      value={entry.role}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <Button
                      disabled={busy === `remove-${entry.id}`}
                      onClick={() => remove(entry)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {busy === `remove-${entry.id}` ? "Removing…" : "Remove"}
                    </Button>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {canManage ? (
        <div className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-50">
            Invite a colleague
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            We do not send the invitation for you. You will get a one-time
            code to pass to your colleague yourself, and they redeem it from
            their own signed-in account. It expires in seven days.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              aria-label="Colleague's email, for your own reference"
              className="max-w-xs"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@company.com (optional note)"
              type="email"
              value={email}
            />
            <select
              aria-label="Role"
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              onChange={(event) =>
                setRole(event.target.value as InvitableRole)
              }
              value={role}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button disabled={busy === "invite"} onClick={invite} type="button">
              {busy === "invite" ? "Creating…" : "Create invitation"}
            </Button>
          </div>

          {newToken ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
              <p className="font-medium text-emerald-900 text-xs dark:text-emerald-200">
                Copy this code now. It is shown once and cannot be retrieved
                again.
              </p>
              <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 font-mono text-xs dark:bg-zinc-900">
                {newToken}
              </code>
              <p className="mt-2 text-emerald-900 text-xs dark:text-emerald-200">
                Your colleague redeems it at /procurement/invitations.
              </p>
            </div>
          ) : null}

          <h3 className="mt-6 font-medium text-sm text-zinc-900 dark:text-zinc-50">
            Pending invitations
          </h3>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              No invitations are waiting to be used.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pending.map((invitation) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                  key={invitation.id}
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {invitation.invitedEmail ?? "No email noted"} ·{" "}
                    {ROLE_LABEL[invitation.role]} · expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                  <Button
                    disabled={busy === `revoke-${invitation.id}`}
                    onClick={() => revoke(invitation.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {busy === `revoke-${invitation.id}`
                      ? "Revoking…"
                      : "Revoke"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
