"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MESSAGE_MAX_LENGTH,
  type MessagePage,
  type OrganizationMessage,
} from "@/lib/procurement/message-types";

function formatSent(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export function ConversationPanel({
  connectionId,
  counterpartyName,
  initialPage,
  organizationId,
}: {
  connectionId: string;
  counterpartyName: string;
  initialPage: MessagePage;
  organizationId: string;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<OrganizationMessage[]>(
    initialPage.messages
  );
  const [page, setPage] = useState(initialPage.page);
  const [pageCount, setPageCount] = useState(initialPage.pageCount);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const endpoint = `/api/procurement/organizations/${organizationId}/connections/${connectionId}/messages`;

  const load = async (target: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${endpoint}?page=${target}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }
      setMessages(data.messages);
      setPage(data.page);
      setPageCount(data.pageCount);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load messages."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(endpoint, {
        body: JSON.stringify({ body }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send the message.");
      }
      setBody("");
      // Reload the last page so the new message lands in the same order the
      // server will serve it, rather than being appended optimistically.
      await load(pageCount);
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : "Failed to send the message.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const remaining = MESSAGE_MAX_LENGTH - body.length;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
          Messages with {counterpartyName}
        </h2>
        <Button
          disabled={isLoading}
          onClick={() => load(page)}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          {isLoading ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {loadError ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {messages.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-zinc-200 border-dashed p-8 text-center dark:border-zinc-800">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              No messages yet
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Start the conversation below.
            </p>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            className={
              message.isOwn
                ? "ml-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                : "mr-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
            }
            key={message.id}
          >
            <header className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {message.senderOrgName ?? "Unknown business"}
                {message.isOwn ? " (you)" : ""}
              </span>
              <time className="text-zinc-500" dateTime={message.createdAt}>
                {formatSent(message.createdAt)}
              </time>
            </header>
            {/* Rendered as text, never as HTML: React escapes this, and
                whitespace-pre-wrap keeps line breaks without markup. */}
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {message.body}
            </p>
          </article>
        ))}
      </div>

      {pageCount > 1 ? (
        <nav
          aria-label="Message pagination"
          className="mt-4 flex items-center justify-between text-sm"
        >
          <Button
            disabled={page <= 1 || isLoading}
            onClick={() => load(page - 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Older
          </Button>
          <span className="text-zinc-600 dark:text-zinc-400">
            Page {page} of {pageCount}
          </span>
          <Button
            disabled={page >= pageCount || isLoading}
            onClick={() => load(page + 1)}
            size="sm"
            type="button"
            variant="outline"
          >
            Newer
          </Button>
        </nav>
      ) : null}

      <form className="mt-6 space-y-2" onSubmit={handleSend}>
        <label className="font-medium text-sm" htmlFor="message-body">
          Send a message
        </label>
        <Textarea
          id="message-body"
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Write to ${counterpartyName}`}
          rows={3}
          value={body}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {remaining} characters left
          </span>
          <Button disabled={isSending || !body.trim()} type="submit">
            {isSending ? "Sending" : "Send"}
          </Button>
        </div>
      </form>
    </section>
  );
}
