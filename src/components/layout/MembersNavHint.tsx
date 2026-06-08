"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Users, X } from "lucide-react";

import { consumeMembersNavHint } from "@/lib/members-nav-hint";

export function MembersNavHint({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (consumeMembersNavHint()) {
      setVisible(true);
      setExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [visible, anchorRef]);

  if (!visible || typeof document === "undefined") {
    return null;
  }

  function dismiss() {
    setVisible(false);
  }

  return createPortal(
    <div
      className="fixed z-[60] w-52 -translate-y-1/2 transition-opacity duration-200"
      style={{ top: position.top, left: position.left }}
      role="status"
    >
      <span
        className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-zinc-200 bg-white"
        aria-hidden
      />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-800">Invite your team</p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={expanded ? "Collapse hint" : "Expand hint"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Dismiss hint"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {expanded ? (
          <div className="space-y-2 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Add teammates anytime from Members — assign roles and send email invites.
            </p>
            <Link
              href="/settings/members"
              onClick={dismiss}
              className="inline-flex text-[11px] font-medium text-zinc-900 underline-offset-2 hover:underline"
            >
              Open Members
            </Link>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
