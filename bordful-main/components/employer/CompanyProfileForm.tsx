'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Employer } from '@/lib/auth/employers';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

function deriveLogoPreview(website: string): string | null {
  if (!website.trim()) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return domain ? `https://logo.clearbit.com/${domain}` : null;
  } catch {
    return null;
  }
}

export function CompanyProfileForm({ employer }: { employer: Employer }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState(employer.companyName ?? '');
  const [website, setWebsite] = useState(employer.website ?? '');
  const [industry, setIndustry] = useState(employer.industry ?? '');
  const [companySize, setCompanySize] = useState(employer.companySize ?? '');
  const [location, setLocation] = useState(employer.location ?? '');
  const [description, setDescription] = useState(employer.description ?? '');
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const previewLogoUrl = deriveLogoPreview(website) ?? employer.logoUrl;

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [previewLogoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/employer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          website: website.trim() || null,
          industry: industry.trim() || null,
          companySize: companySize || null,
          location: location.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save.');
      }

      toast({ title: 'Company profile saved' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
        className: 'bg-destructive border border-red-600 shadow-md',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {previewLogoUrl && !logoLoadFailed ? (
            <Image
              alt=""
              className="h-full w-full object-contain p-1.5"
              height={64}
              onError={() => setLogoLoadFailed(true)}
              src={previewLogoUrl}
              unoptimized
              width={64}
            />
          ) : (
            <Building2 aria-hidden="true" className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
          )}
        </span>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Logo is auto-detected from your website. Add a website below to preview it.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-name">
          Company name <span className="text-red-500">*</span>
        </label>
        <Input
          id="company-name"
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
          required
          value={companyName}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-website">
          Website
        </label>
        <Input
          id="company-website"
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="acme.com"
          value={website}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-industry">
            Industry
          </label>
          <Input
            id="company-industry"
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Software"
            value={industry}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-size">
            Company size
          </label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            id="company-size"
            onChange={(e) => setCompanySize(e.target.value)}
            value={companySize}
          >
            <option value="">Select size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-location">
          Location
        </label>
        <Input
          id="company-location"
          onChange={(e) => setLocation(e.target.value)}
          placeholder="San Francisco, CA"
          value={location}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="company-description">
          About the company
        </label>
        <Textarea
          id="company-description"
          maxLength={1000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does your company do? What's it like to work there?"
          rows={4}
          value={description}
        />
        <p className="text-xs text-zinc-400">{description.length}/1000</p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button disabled={isSubmitting || !companyName.trim()} type="submit">
          {isSubmitting ? 'Saving…' : 'Save profile'}
        </Button>
        <Button disabled={isSubmitting} onClick={() => router.back()} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
