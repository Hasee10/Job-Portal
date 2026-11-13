"use client";
import { ArrowLeft, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { AuthNavStatus } from "@/components/auth/AuthNavStatus";
import { SITE_LINKS, siteContext } from "@/lib/ui/site-navigation";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

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
      <div className="container mx-auto flex h-[80px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Brand />
        </div>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-0.5 rounded-full border bg-muted/25 p-1 lg:flex"
        >
          {links.map((link) => {
            // Dashboard entry can issue a local demo session, requiring a document navigation.
            const NavigationLink =
              link.href === "/procurement/organizations" ? "a" : Link;
            return (
              <NavigationLink
                aria-current={active(link.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${active(link.href) ? "bg-background font-semibold text-[var(--brand-ink)] shadow-sm dark:text-lime-200" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </NavigationLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {context === "procurement" && (
            <a
              className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground text-xs lg:hidden"
              href="/procurement/organizations"
            >
              Dashboard
            </a>
          )}
          <ThemeToggle />
          <div className="hidden lg:block">
            <AuthNavStatus
              accountKind={accountKind}
              context={context}
              variant="desktop"
            />
          </div>
          <button
            aria-controls={open ? "mobile-navigation" : undefined}
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="rounded-lg border p-2 lg:hidden"
            onClick={() => setOpenPath(open ? null : pathname)}
            ref={toggle}
            type="button"
          >
            {open ? (
              <X aria-hidden="true" size={19} />
            ) : (
              <Menu aria-hidden="true" size={19} />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="border-t px-4 py-5 lg:hidden"
          id="mobile-navigation"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {links.map((link) => {
              const NavigationLink =
                link.href === "/procurement/organizations" ? "a" : Link;
              return (
                <NavigationLink
                  aria-current={active(link.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-3 text-sm ${active(link.href) ? "bg-muted font-medium" : "text-muted-foreground"}`}
                  href={link.href}
                  key={link.href}
                  onClick={() => setOpenPath(null)}
                >
                  {link.label}
                </NavigationLink>
              );
            })}
            {context !== "home" && (
              <Link
                className="flex items-center gap-2 px-3 py-3 text-muted-foreground text-xs"
                href="/"
                onClick={() => setOpenPath(null)}
              >
                <ArrowLeft aria-hidden="true" size={14} />
                Caliber home
              </Link>
            )}
            <div className="border-t pt-4 lg:hidden">
              <AuthNavStatus
                accountKind={accountKind}
                context={context}
                onNavigate={() => setOpenPath(null)}
              />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
