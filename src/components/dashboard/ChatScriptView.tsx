"use client";

import { useMemo } from "react";

import {
  chatScriptTypeLabel,
  parseChatScript,
  type ChatScriptRowType,
} from "@/lib/chat-script-format";
import { cn } from "@/lib/utils";

function typeBadgeClass(type: ChatScriptRowType) {
  switch (type) {
    case "hook":
      return "bg-purple-50 text-purple-700";
    case "visual":
      return "bg-sky-50 text-sky-700";
    case "spoken":
      return "bg-emerald-50 text-emerald-700";
    case "caption":
      return "bg-amber-50 text-amber-800";
    case "cta":
      return "bg-zinc-900 text-white";
    case "note":
      return "bg-zinc-100 text-zinc-600";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export function ChatScriptView({ text }: { text: string }) {
  const parsed = useMemo(() => parseChatScript(text), [text]);

  if (parsed.sections.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{text.trim()}</p>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.title ? (
        <h4 className="font-display text-base font-semibold text-zinc-900">{parsed.title}</h4>
      ) : null}

      {parsed.sections.map((section) => {
        const notes = section.rows.filter((row) => row.type === "note");
        const rows = section.rows.filter((row) => row.type !== "note");
        const isNotesSection = /filming|production|notes/i.test(section.name);

        return (
          <div
            key={`${section.name}-${section.timing ?? "no-timing"}`}
            className="overflow-hidden rounded-xl border border-zinc-200"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
              <h5 className="text-sm font-semibold tracking-wide text-zinc-900">{section.name}</h5>
              {section.timing ? (
                <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200">
                  {section.timing}
                </span>
              ) : null}
            </div>

            {rows.length > 0 ? (
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="w-28 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Type
                    </th>
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Content
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${section.name}-${row.type}-${index}`}
                      className="border-b border-zinc-100 last:border-b-0 align-top"
                    >
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                            typeBadgeClass(row.type),
                          )}
                        >
                          {chatScriptTypeLabel(row.type)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[15px] leading-6 text-zinc-800 whitespace-pre-wrap">
                        {row.content}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {notes.length > 0 || isNotesSection ? (
              <ul className="list-disc space-y-1.5 px-5 py-3 text-sm leading-6 text-zinc-700">
                {notes.map((note, index) => (
                  <li key={`${section.name}-note-${index}`}>{note.content}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
