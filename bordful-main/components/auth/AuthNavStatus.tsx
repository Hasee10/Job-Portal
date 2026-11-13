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
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  const close = () => {
    setOpen(false);
    onNavigate?.();
  };
  if (status === "loading") return null;
  if (session?.user) {
    const capabilities = capabilitiesFor(session.user.role);
    const links: { href: string; label: string }[] = [];
    if (context !== "jobs")
      links.push({
        href: "/procurement/organizations",
        label: "Business workspace",
      });
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
      if (session.user.role === "seeker")
        links.push({ href: "/account/resume", label: "Resume builder" });
    }
    const items = (
      <>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={close}
            className="block rounded-lg px-4 py-3 text-sm hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          className="block w-full rounded-lg border-t px-4 py-3 text-left text-sm hover:bg-muted"
          onClick={() => {
            close();
            signOut({ callbackUrl: "/" });
          }}
        >
          Sign out
        </button>
      </>
    );
    if (variant === "mobile")
      return <div className={`space-y-1 ${className}`}>{items}</div>;
    return (
      <div
        ref={container}
        className={`relative ${className}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            container.current?.querySelector("button")?.focus();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setOpen(false);
        }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <User size={16} aria-hidden="true" />
          <span className="max-w-28 truncate">
            {session.user.name || "My account"}
          </span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>
        {open && (
          <div
            id={menuId}
            className="absolute right-0 mt-2 w-60 rounded-xl border bg-popover p-1 shadow-lg"
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
        href={signin}
        onClick={onNavigate}
        className="text-muted-foreground hover:text-foreground"
      >
        Sign in
      </Link>
      <Link
        href={signup}
        onClick={onNavigate}
        className="rounded-full bg-[var(--brand-ink)] px-4 py-2.5 font-medium text-white hover:bg-[#285c49]"
      >
        Get started
      </Link>
    </div>
  );
}
