"use client";

import { Textarea } from "@/components/ui/textarea";

export function ScriptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[240px] resize-y leading-6"
    />
  );
}
