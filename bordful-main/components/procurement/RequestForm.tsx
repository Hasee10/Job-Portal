'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ProcurementType, ProcurementVisibility } from '@/lib/procurement/request-actions';

const TYPES: { value: ProcurementType; label: string; hint: string }[] = [
  { value: 'rfi', label: 'RFI', hint: 'Request for Information — lightweight, no pricing required' },
  { value: 'rfq', label: 'RFQ', hint: 'Request for Quote — pricing required' },
  { value: 'rfp', label: 'RFP', hint: 'Request for Proposal — pricing + methodology required' },
  { value: 'tender', label: 'Tender', hint: 'Full formal tender — document upload required, usually sealed' },
];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function RequestForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<ProcurementType>('rfp');
  const [category, setCategory] = useState('staffing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProcurementVisibility>('invite_only');
  const [sealedBids, setSealedBids] = useState(false);
  const [requiresPrequalification, setRequiresPrequalification] = useState(false);
  const [responseDeadline, setResponseDeadline] = useState('');

  const handleTypeChange = (next: ProcurementType) => {
    setType(next);
    // Tender is the strictness ceiling of this engine (proc.md §3) - default
    // its two compliance-critical toggles on, but leave them editable so a
    // buyer running a lightweight tender-labeled process isn't forced into it.
    if (next === 'tender') {
      setSealedBids(true);
      setRequiresPrequalification(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/procurement/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: category.trim(),
          title: title.trim(),
          description: description.trim(),
          specFields: [],
          visibility,
          sealedBids,
          requiresPrequalification,
          responseDeadline: responseDeadline ? new Date(responseDeadline).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create request.');

      router.push(`/procurement/requests/${data.request.id}`);
    } catch (error) {
      toast({
        title: 'Could not create request',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block font-medium text-sm" htmlFor="request-type">
          Type
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => (
            <button
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                type === t.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input text-zinc-600 hover:border-zinc-400 dark:text-zinc-400'
              }`}
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              title={t.hint}
              type="button"
            >
              <span className="font-semibold uppercase">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-muted-foreground text-xs">
          {TYPES.find((t) => t.value === type)?.hint}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block font-medium text-sm" htmlFor="request-category">
          Category
        </label>
        <Input
          id="request-category"
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. staffing, construction, software"
          required
          value={category}
        />
      </div>

      <div>
        <label className="mb-1.5 block font-medium text-sm" htmlFor="request-title">
          Title
        </label>
        <Input
          id="request-title"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Senior backend engineering staffing partner"
          required
          value={title}
        />
      </div>

      <div>
        <label className="mb-1.5 block font-medium text-sm" htmlFor="request-description">
          Description
        </label>
        <Textarea
          id="request-description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What you need, scope, timeline, and any requirements vendors should know up front."
          required
          rows={6}
          value={description}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-medium text-sm" htmlFor="request-visibility">
            Visibility
          </label>
          <select
            className={selectClass}
            id="request-visibility"
            onChange={(e) => setVisibility(e.target.value as ProcurementVisibility)}
            value={visibility}
          >
            <option value="invite_only">Invite only</option>
            <option value="open">Open</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-sm" htmlFor="request-deadline">
            Response deadline
          </label>
          <Input
            id="request-deadline"
            onChange={(e) => setResponseDeadline(e.target.value)}
            type="datetime-local"
            value={responseDeadline}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 bg-muted/30 p-4 dark:border-zinc-800">
        <p className="font-medium text-sm">Formality</p>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            checked={sealedBids}
            className="mt-0.5"
            onChange={(e) => setSealedBids(e.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="font-medium">Sealed bids</span>
            <span className="block text-muted-foreground text-xs">
              Responses are hidden from you too until you open them after the deadline.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            checked={requiresPrequalification}
            className="mt-0.5"
            onChange={(e) => setRequiresPrequalification(e.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="font-medium">Require prequalification</span>
            <span className="block text-muted-foreground text-xs">
              Invited vendors must be approved by you before they can respond.
            </span>
          </span>
        </label>
      </div>

      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Creating…' : 'Create request'}
      </Button>
    </form>
  );
}
