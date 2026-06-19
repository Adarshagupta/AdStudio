import Link from "next/link";
import type { ReactNode } from "react";

import { LiteMoovWordmark } from "@/components/brand/LiteMoovWordmark";
import { cn } from "@/lib/utils";

/** Full-page auth background: soft violet (left) → lavender (mid) → white (right). */
export const AUTH_PAGE_GRADIENT = "linear-gradient(90deg, #a78bfa 0%, #ede9fe 48%, #ffffff 76%)";

/** @deprecated Use AUTH_PAGE_GRADIENT */
export const AUTH_HERO_GRADIENT = AUTH_PAGE_GRADIENT;

export const authInputClass =
  "h-10 rounded-xl border-zinc-200/90 bg-white text-sm shadow-sm shadow-zinc-900/5 placeholder:text-zinc-400 focus-visible:border-violet-300 focus-visible:ring-violet-200/60 sm:h-11 sm:text-[15px]";

export const authPrimaryButtonClass =
  "h-10 w-full rounded-full bg-violet-600 text-sm font-semibold text-white shadow-md shadow-violet-600/25 hover:bg-violet-700 sm:h-11 sm:text-[15px]";

export const authOutlineButtonClass =
  "h-10 w-full rounded-full border-zinc-200/90 bg-white text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 sm:h-11 sm:text-[15px]";

export function authLinkClassName(className?: string) {
  return cn("font-medium text-violet-600 transition hover:text-violet-800", className);
}

export function AuthBrandHeader() {
  return (
    <Link href="/" className="inline-block transition hover:opacity-90">
      <LiteMoovWordmark size="lg" />
    </Link>
  );
}

export function AuthFormPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] space-y-5 sm:space-y-6">
      <div className="space-y-2">
        <AuthBrandHeader />
        <div className="space-y-1 pt-1">
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[1.65rem]">
            {title}
          </h1>
          {subtitle ? <div className="text-sm leading-snug text-zinc-500">{subtitle}</div> : null}
        </div>
      </div>
      {children}
      {footer}
    </div>
  );
}

export function AuthField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}
