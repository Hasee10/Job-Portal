'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { RecruiterAccount } from '@/lib/auth/recruiter-accounts';

export function RecruiterProfileForm({ recruiter }: { recruiter: RecruiterAccount }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(recruiter.name);
  const [agency, setAgency] = useState(recruiter.agency ?? '');
  const [bio, setBio] = useState(recruiter.bio ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(recruiter.linkedinUrl ?? '');
  const [specialtiesRaw, setSpecialtiesRaw] = useState(recruiter.specialties.join(', '));

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
