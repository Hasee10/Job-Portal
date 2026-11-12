"use client";
import { Menu, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { AuthNavStatus } from "@/components/auth/AuthNavStatus";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { SITE_LINKS, siteContext } from "@/lib/ui/site-navigation";

export function Nav() {
  const pathname = usePathname();
  const context = siteContext(pathname);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const toggle = useRef<HTMLButtonElement>(null);
  const links = SITE_LINKS[context];
  const accountKind = pathname.startsWith("/recruiter")
    ? "recruiter"
    : pathname.startsWith("/dashboard") || pathname === "/pricing"
      ? "employer"
      : "seeker";
  const active = (href: string) =>
    (href === "/procurement/organizations" &&
      pathname === "/procurement/preview") ||
    pathname === href ||
    (href !== "/procurement" && pathname.startsWith(`${href}/`));
  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpenPath(null);
          toggle.current?.focus();
        }
      }}
    >
      <div className="container mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Brand />
          {context !== "home" && (
            <span className="hidden border-l pl-4 font-medium text-muted-foreground text-xs xl:block">
              {context === "jobs" ? "CAREERS" : "PROCUREMENT"}
            </span>
          )}
        </div>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              aria-current={active(link.href) ? "page" : undefined}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${active(link.href) ? "bg-primary/5 font-medium text-[#086b85] dark:text-cyan-200" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden lg:block">
            <AuthNavStatus
              variant="desktop"
              context={context}
              accountKind={accountKind}
            />
          </div>
          <button
            type="button"
            ref={toggle}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls={open ? "mobile-navigation" : undefined}
            onClick={() => setOpenPath(open ? null : pathname)}
            className="rounded-lg border p-2 lg:hidden"
          >
            {open ? (
              <X size={19} aria-hidden="true" />
            ) : (
              <Menu size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t px-4 py-5 lg:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpenPath(null)}
                aria-current={active(link.href) ? "page" : undefined}
                className={`block rounded-lg px-3 py-3 text-sm ${active(link.href) ? "bg-muted font-medium" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
            {context !== "home" && (
              <Link
                href="/"
                onClick={() => setOpenPath(null)}
                className="flex items-center gap-2 px-3 py-3 text-muted-foreground text-xs"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                JobLo home
              </Link>
            )}
            <div className="border-t pt-4 lg:hidden">
              <AuthNavStatus
                context={context}
                accountKind={accountKind}
                onNavigate={() => setOpenPath(null)}
              />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
