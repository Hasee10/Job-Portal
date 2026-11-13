"use client";
import { ChevronDown, User } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { capabilitiesFor } from "@/lib/auth/capabilities";
import type { SiteContext } from "@/lib/ui/site-navigation";

type AuthNavStatusProps = {
  accountKind?: "seeker" | "employer" | "recruiter";
  className?: string;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
  context?: SiteContext;
};
export function AuthNavStatus({
  accountKind = "seeker",
  className = "",
  onNavigate,
  variant = "mobile",
  context = "home",
}: AuthNavStatusProps) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (
        container.current &&
        !container.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  const close = () => {
    setOpen(false);
    onNavigate?.();
  };
  if (status === "loading") {
    return null;
  }
  if (session?.user) {
    const capabilities = capabilitiesFor(session.user.role);
    const links: { href: string; label: string }[] = [
      {
        href: "/procurement/organizations",
        label: "Procurement dashboard",
      },
    ];
    if (context !== "procurement" && capabilities.recruitment) {
      links.push({
        href: capabilities.workspaceHref,
        label:
          session.user.role === "seeker"
            ? "Job account"
            : session.user.role === "recruiter"
              ? "Recruiter workspace"
              : "Hiring workspace",
      });
      if (session.user.role === "seeker") {
        links.push({ href: "/account/resume", label: "Resume builder" });
      }
    }
    const items = (
      <>
        {links.map((link) => (
          <Link
            className="block rounded-lg px-4 py-3 text-sm hover:bg-muted"
            href={link.href}
            key={link.href}
            onClick={close}
          >
            {link.label}
          </Link>
        ))}
        <button
          className="block w-full rounded-lg border-t px-4 py-3 text-left text-sm hover:bg-muted"
          onClick={() => {
            close();
            signOut({ callbackUrl: "/" });
          }}
          type="button"
        >
          Sign out
        </button>
      </>
    );
    if (variant === "mobile") {
      return <div className={`space-y-1 ${className}`}>{items}</div>;
    }
    return (
      <div
        className={`relative ${className}`}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            container.current?.querySelector("button")?.focus();
          }
        }}
        ref={container}
      >
        <button
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <User aria-hidden="true" size={16} />
          <span className="max-w-28 truncate">
            {session.user.name || "My account"}
          </span>
          <ChevronDown aria-hidden="true" size={13} />
        </button>
        {open && (
          <div
            className="absolute right-0 mt-2 w-60 rounded-xl border bg-popover p-1 shadow-lg"
            id={menuId}
          >
            {items}
          </div>
        )}
      </div>
    );
  }
  const signin =
    context === "procurement"
      ? "/sign-in?callbackUrl=/procurement/organizations"
      : context === "jobs"
        ? accountKind === "recruiter"
          ? "/recruiter/sign-in"
          : accountKind === "employer"
            ? "/sign-in?callbackUrl=/dashboard"
            : "/account/sign-in"
        : "/join";
  const signup =
    context === "procurement"
      ? "/sign-up?callbackUrl=/procurement/organizations"
      : context === "jobs"
        ? accountKind === "recruiter"
          ? "/recruiter/sign-up"
          : accountKind === "employer"
            ? "/sign-up"
            : "/account/sign-in?intent=signup"
        : "/join";
  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <Link
        className="text-muted-foreground hover:text-foreground"
        href={signin}
        onClick={onNavigate}
      >
        Sign in
      </Link>
      <Link
        className="rounded-full bg-[var(--brand-ink)] px-4 py-2.5 font-medium text-white hover:bg-[#285c49]"
        href={signup}
        onClick={onNavigate}
      >
        Get started
      </Link>
    </div>
  );
}
