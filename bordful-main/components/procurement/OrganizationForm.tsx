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
  const [productsServices, setProductsServices] = useState(
    organization?.productsServices ?? ""
  );
  const [categories, setCategories] = useState(
    (organization?.categories ?? []).join(", ")
  );
  const [operatingRegions, setOperatingRegions] = useState(
    (organization?.operatingRegions ?? []).join(", ")
  );
  const [publicContactEmail, setPublicContactEmail] = useState(
    organization?.publicContactEmail ?? ""
  );
  const [isPublic, setIsPublic] = useState(organization?.isPublic ?? false);

  const toTags = (value: string): string[] => [
    ...new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    ),
  ];

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
      // The discovery fields only exist on an edit: creation is identity and
      // capabilities, and a new organization is never public.
      const payload = organization
        ? {
            categories: toTags(categories),
            companySize,
            description,
            industry,
            isBuyer,
            isPublic,
            isSupplier,
            location,
            name,
            operatingRegions: toTags(operatingRegions),
            productsServices,
            publicContactEmail,
            website,
          }
        : {
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

      {organization ? (
        <section className="space-y-5 border-zinc-200 border-t pt-6 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Marketplace listing
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Everything here is shown exactly as you write it. We do not verify
              these details, so treat them as self-declared.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-sm" htmlFor="org-products">
              Products and services
            </label>
            <Textarea
              disabled={!canEdit}
              id="org-products"
              onChange={(e) => setProductsServices(e.target.value)}
              placeholder="What does this business actually provide?"
              rows={3}
              value={productsServices}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="org-categories">
                Categories
              </label>
              <Input
                disabled={!canEdit}
                id="org-categories"
                onChange={(e) => setCategories(e.target.value)}
                placeholder="staffing, IT hardware"
                value={categories}
              />
              <p className="text-xs text-zinc-500">Separate with commas.</p>
            </div>
            <div className="space-y-1.5">
              <label className="font-medium text-sm" htmlFor="org-regions">
                Operating countries or regions
              </label>
              <Input
                disabled={!canEdit}
                id="org-regions"
                onChange={(e) => setOperatingRegions(e.target.value)}
                placeholder="Pakistan, UAE"
                value={operatingRegions}
              />
              <p className="text-xs text-zinc-500">Separate with commas.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-sm" htmlFor="org-contact">
              Public contact email
            </label>
            <Input
              disabled={!canEdit}
              id="org-contact"
              onChange={(e) => setPublicContactEmail(e.target.value)}
              type="email"
              value={publicContactEmail}
            />
          </div>

          <label
            className="flex items-start gap-2.5 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
            htmlFor="org-public"
          >
            <input
              checked={isPublic}
              className="mt-0.5"
              disabled={!canEdit}
              id="org-public"
              onChange={(e) => setIsPublic(e.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-medium text-zinc-900 dark:text-zinc-50">
                List this business in the public marketplace directory
              </span>
              <span className="mt-0.5 block text-zinc-600 dark:text-zinc-400">
                Anyone can then find the details above, including people who are
                not signed in. Your members, requests and quotations stay
                private either way. Off by default.
              </span>
            </span>
          </label>
        </section>
      ) : null}

      {canEdit ? (
        <Button disabled={isSubmitting} type="submit">
          {organization ? "Save changes" : "Create organization"}
        </Button>
      ) : null}
    </form>
  );
}
