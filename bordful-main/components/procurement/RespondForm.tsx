'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ProcurementRequest } from '@/lib/procurement/request-actions';
import type { ProcurementResponse } from '@/lib/procurement/response-actions';

export function RespondForm({
  request,
  existingResponse,
}: {
  request: ProcurementRequest;
  existingResponse: ProcurementResponse | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalText, setProposalText] = useState(existingResponse?.proposalText ?? '');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [file, setFile] = useState<File | null>(null);

  const requiresPricing = request.type !== 'rfi';
  const requiresDocument = request.type === 'rfp' || request.type === 'tender';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalText.trim()) return;
    if (requiresPricing && !price.trim()) {
      toast({ title: 'Pricing is required for this request type.', variant: 'destructive' });
      return;
    }
    if (requiresDocument && !file) {
      toast({ title: 'A proposal document is required for this request type.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let proposalDocumentPath: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(`/api/procurement/vendor/requests/${request.id}/documents`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload document.');
        proposalDocumentPath = uploadData.path;
      }

      const res = await fetch(`/api/procurement/vendor/requests/${request.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalText: proposalText.trim(),
          pricing: requiresPricing ? { amount: price.trim(), currency } : null,
          proposalDocumentPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit response.');

      toast({ title: 'Response submitted' });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Could not submit response',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingResponse && !existingResponse.isWithdrawn) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="font-medium text-sm">
          You submitted a response on {new Date(existingResponse.submittedAt).toLocaleString()}.
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          {request.sealedBids
            ? 'This is a sealed request — the buyer cannot see your response until bids are opened.'
            : 'The buyer can review your response now.'}
        </p>
        <Button
          className="mt-4"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            try {
              const res = await fetch(`/api/procurement/vendor/requests/${request.id}/withdraw`, {
                method: 'POST',
              });
              if (!res.ok) throw new Error((await res.json()).error || 'Failed to withdraw.');
              router.refresh();
            } catch (error) {
              toast({
                title: 'Could not withdraw',
                description: error instanceof Error ? error.message : 'Something went wrong.',
                variant: 'destructive',
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
          size="sm"
          variant="outline"
        >
          Withdraw response
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block font-medium text-sm" htmlFor="proposal-text">
          {request.type === 'rfi' ? 'Your information' : 'Your proposal'}
        </label>
        <Textarea
          id="proposal-text"
          onChange={(e) => setProposalText(e.target.value)}
          placeholder={
            request.type === 'rfi'
              ? 'Share the requested information and any relevant experience.'
              : 'Describe your approach, timeline, and why you’re the right fit.'
          }
          required
          rows={8}
          value={proposalText}
        />
      </div>

      {requiresPricing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-medium text-sm" htmlFor="price">
              Price
            </label>
            <Input
              id="price"
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 15000"
              value={price}
            />
          </div>
          <div>
            <label className="mb-1.5 block font-medium text-sm" htmlFor="currency">
              Currency
            </label>
            <Input id="currency" onChange={(e) => setCurrency(e.target.value)} value={currency} />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block font-medium text-sm" htmlFor="proposal-file">
          Proposal document {requiresDocument ? '(required)' : '(optional)'}
        </label>
        <input
          accept=".pdf,.doc,.docx"
          id="proposal-file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          type="file"
        />
        <p className="mt-1 text-muted-foreground text-xs">PDF or Word, up to 10MB.</p>
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Submitting…' : 'Submit response'}
      </Button>
    </form>
  );
}
