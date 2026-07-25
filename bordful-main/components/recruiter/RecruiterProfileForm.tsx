'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { RecruiterAccount } from '@/lib/auth/recruiter-accounts';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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

export function RecruiterProfileForm({ recruiter }: { recruiter: RecruiterAccount }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(recruiter.name);
  const [agency, setAgency] = useState(recruiter.agency ?? '');
  const [bio, setBio] = useState(recruiter.bio ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(recruiter.linkedinUrl ?? '');
  const [specialtiesRaw, setSpecialtiesRaw] = useState(recruiter.specialties.join(', '));
  const [website, setWebsite] = useState(recruiter.website ?? '');
  const [industry, setIndustry] = useState(recruiter.industry ?? '');
  const [companySize, setCompanySize] = useState(recruiter.companySize ?? '');
  const [location, setLocation] = useState(recruiter.location ?? '');
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const previewLogoUrl = deriveLogoPreview(website) ?? recruiter.logoUrl;

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [previewLogoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const specialties = specialtiesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    try {
      const res = await fetch('/api/recruiter/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          agency: agency.trim() || null,
          bio: bio.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          specialties,
          website: website.trim() || null,
          industry: industry.trim() || null,
          companySize: companySize || null,
          location: location.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save.');
      }

      toast({ title: 'Profile saved' });
      router.push('/recruiter/dashboard');
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
          Logo is auto-detected from your agency&rsquo;s website. Add one below to preview it.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-name">
          Full name <span className="text-red-500">*</span>
        </label>
        <Input
          id="profile-name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          value={name}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-agency">
          Agency / company
        </label>
        <Input
          id="profile-agency"
          onChange={(e) => setAgency(e.target.value)}
          placeholder="Acme Recruiting"
          value={agency}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-website">
          Website
        </label>
        <Input
          id="profile-website"
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="acmerecruiting.com"
          value={website}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-industry">
            Industry focus
          </label>
          <Input
            id="profile-industry"
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Software"
            value={industry}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-size">
            Agency size
          </label>
          <select
            className={selectClass}
            id="profile-size"
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
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-location">
          Location
        </label>
        <Input
          id="profile-location"
          onChange={(e) => setLocation(e.target.value)}
          placeholder="San Francisco, CA"
          value={location}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-bio">
          Bio
        </label>
        <Textarea
          id="profile-bio"
          maxLength={1000}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell candidates about your background and the roles you typically fill…"
          rows={4}
          value={bio}
        />
        <p className="text-xs text-zinc-400">{bio.length}/1000</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-specialties">
          Specialties
        </label>
        <Input
          id="profile-specialties"
          onChange={(e) => setSpecialtiesRaw(e.target.value)}
          placeholder="Engineering, Product, Design"
          value={specialtiesRaw}
        />
        <p className="text-xs text-zinc-400">Comma-separated list of up to 20 specialties.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="profile-linkedin">
          LinkedIn URL
        </label>
        <Input
          id="profile-linkedin"
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/your-profile"
          type="url"
          value={linkedinUrl}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button disabled={isSubmitting || !name.trim()} type="submit">
          {isSubmitting ? 'Saving…' : 'Save profile'}
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={() => router.back()}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
