"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  chatScriptTypeLabel,
  parseChatScript,
  type ChatScriptRowType,
} from "@/lib/chat-script-format";
import { cn } from "@/lib/utils";

function typeDot(type: ChatScriptRowType) {
  switch (type) {
    case "hook": return "bg-purple-400";
    case "visual": return "bg-sky-400";
    case "spoken": return "bg-emerald-400";
    case "caption": return "bg-amber-400";
    case "cta": return "bg-zinc-800";
    case "note": return "bg-zinc-300";
    default: return "bg-zinc-300";
  }
}

export function ChatScriptView({ text }: { text: string }) {
  const parsed = useMemo(() => parseChatScript(text), [text]);
  const [collapsed, setCollapsed] = useState(true);

  if (parsed.sections.length === 0) {
    return <p className="whitespace-pre-wrap text-xs leading-5 text-zinc-600">{text.trim()}</p>;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
      >
        <span className="font-medium">Script</span>
        <span className="text-zinc-400">{parsed.sections.length} sections</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", !collapsed && "rotate-180")} />
      </button>

      {!collapsed && (
        <div className="space-y-2 border-l border-zinc-200 pl-2">
          {parsed.sections.map((section, si) => (
            <div key={si} className="space-y-1">
              <p className="text-xs font-medium text-zinc-700">
                {section.name}
                {section.timing && <span className="ml-1 text-zinc-400">{section.timing}</span>}
              </p>
              {section.rows.map((row, ri) => (
                <div key={ri} className="flex items-start gap-1.5 text-xs leading-5">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", typeDot(row.type))} />
                  <span className="text-zinc-500 shrink-0">{chatScriptTypeLabel(row.type)}</span>
                  <span className="text-zinc-700 whitespace-pre-wrap">{row.content}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
