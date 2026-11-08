"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@/lib/procurement/organization-actions";

// Create and edit share one form: the fields and the capability rule are
// identical, and the only difference is the endpoint and method.
export function OrganizationForm({
  organization,
  canEdit = true,
}: {
  organization?: Organization;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(organization?.name ?? "");
  const [description, setDescription] = useState(
    organization?.description ?? ""
  );
  const [website, setWebsite] = useState(organization?.website ?? "");
  const [industry, setIndustry] = useState(organization?.industry ?? "");
  const [companySize, setCompanySize] = useState(
    organization?.companySize ?? ""
  );
  const [location, setLocation] = useState(organization?.location ?? "");
  const [isBuyer, setIsBuyer] = useState(organization?.isBuyer ?? false);
  const [isSupplier, setIsSupplier] = useState(
    organization?.isSupplier ?? false
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Business name is required.", variant: "destructive" });
      return;
    }
    if (!(isBuyer || isSupplier)) {
      toast({
        title: "Choose at least one capability: buyer, supplier, or both.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        companySize,
        description,
        industry,
        isBuyer,
        isSupplier,
        location,
        name,
        website,
      };
      const res = await fetch(
        organization
          ? `/api/procurement/organizations/${organization.id}`
          : "/api/procurement/organizations",
        {
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json" },
          method: organization ? "PATCH" : "POST",
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      toast({
        title: organization ? "Organization updated." : "Organization created.",
      });
      router.push(`/procurement/organizations/${data.organization.id}`);
      router.refresh();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label className="font-medium text-sm" htmlFor="org-name">
          Business name
        </label>
        <Input
          disabled={!canEdit}
          id="org-name"
          onChange={(e) => setName(e.target.value)}
          required
          value={name}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium text-sm">
          How will this business use the marketplace?
        </legend>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A business can be both — buying from suppliers and selling to other
          buyers from the same account.
        </p>
        <label className="flex items-center gap-2 text-sm" htmlFor="org-buyer">
          <input
            checked={isBuyer}
            disabled={!canEdit}
            id="org-buyer"
            onChange={(e) => setIsBuyer(e.target.checked)}
            type="checkbox"
          />
          Buyer — publish requests and source from suppliers
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="org-supplier"
        >
          <input
            checked={isSupplier}
            disabled={!canEdit}
            id="org-supplier"
            onChange={(e) => setIsSupplier(e.target.checked)}
            type="checkbox"
          />
          Supplier — respond to requests and submit quotations
        </label>
      </fieldset>

      <div className="space-y-1.5">
        <label className="font-medium text-sm" htmlFor="org-description">
          Description
        </label>
        <Textarea
          disabled={!canEdit}
          id="org-description"
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          value={description}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="org-industry">
            Industry
          </label>
          <Input
            disabled={!canEdit}
            id="org-industry"
            onChange={(e) => setIndustry(e.target.value)}
            value={industry}
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="org-size">
            Company size
          </label>
          <Input
            disabled={!canEdit}
            id="org-size"
            onChange={(e) => setCompanySize(e.target.value)}
            value={companySize}
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="org-location">
            Location
          </label>
          <Input
            disabled={!canEdit}
            id="org-location"
            onChange={(e) => setLocation(e.target.value)}
            value={location}
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-medium text-sm" htmlFor="org-website">
            Website
          </label>
          <Input
            disabled={!canEdit}
            id="org-website"
            onChange={(e) => setWebsite(e.target.value)}
            value={website}
          />
        </div>
      </div>

      {canEdit && (
        <Button disabled={isSubmitting} type="submit">
          {organization ? "Save changes" : "Create organization"}
        </Button>
      )}
    </form>
  );
}
