import Link from "next/link";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { AIToolsNavDropdown } from "@/components/layout/AIToolsNavDropdown";
import { Button } from "@/components/ui/button";
import { LANDING_NAV_LINKS, PUBLIC_NAV_LINKS } from "@/lib/ai-tools-nav";
import { cn } from "@/lib/utils";

type PublicSiteHeaderProps = {
  variant?: "dark" | "light";
  mode?: "landing" | "public";
  className?: string;
};

function NavLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "dark" | "light";
}) {
  const isDark = variant === "dark";
  const isHash = href.startsWith("#");

  const className = cn(
    "transition",
    isDark ? "text-white/95 hover:text-white" : "text-zinc-600 hover:text-zinc-900",
  );

  if (isHash) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function PublicSiteHeader({
  variant = "dark",
  mode = "public",
  className,
}: PublicSiteHeaderProps) {
  const isDark = variant === "dark";
  const links = mode === "landing" ? LANDING_NAV_LINKS : PUBLIC_NAV_LINKS;

  return (
    <header
      className={cn(
        "relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-4 pt-10 md:px-8 md:pt-14 md:pb-5",
        className,
      )}
    >
      <Link href="/" className="inline-block transition hover:opacity-90">
        <LiteMoovWordmark size="xl" tone={isDark ? "dark" : "light"} />
      </Link>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-sm font-medium md:flex lg:gap-7">
        <AIToolsNavDropdown variant={variant} />
        {links.map((link) => (
          <NavLink key={link.label} href={link.href} label={link.label} variant={variant} />
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/signup"
          className={cn(
            "rounded-full px-3 py-2 text-sm font-medium transition sm:px-4",
            isDark ? "text-white hover:bg-white/10" : "text-zinc-600 hover:bg-zinc-100",
          )}
        >
          Sign up
        </Link>
        <Button
          asChild
          size="sm"
          variant={isDark ? "default" : "outline"}
          className={cn(
            "h-9 rounded-full px-4 text-sm font-semibold",
            isDark
              ? "border-0 bg-white text-violet-950 shadow-md hover:bg-white/95"
              : "border-zinc-200 text-zinc-900 hover:bg-zinc-50",
          )}
        >
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </header>
  );
}

export function PublicSiteHeaderCompact(props: Omit<PublicSiteHeaderProps, "className">) {
  return <PublicSiteHeader {...props} className="pb-2 pt-5 md:pb-3 md:pt-6" />;
}
