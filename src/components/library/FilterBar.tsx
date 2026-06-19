import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const filters = [
  { label: "All", value: "all" },
  { label: "UGC", value: "UGC" },
  { label: "Brain rot", value: "BRAIN_ROT" },
  { label: "Static", value: "STATIC" },
  { label: "Review", value: "REVIEW" },
];

export function FilterBar({
  selectedType,
  query,
  from,
  to,
}: {
  selectedType: string;
  query: string;
  from: string;
  to: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/library${filter.value === "all" ? "" : `?type=${filter.value}`}`}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              selectedType === filter.value && "bg-purple-50 text-purple-950",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {selectedType !== "all" ? <input type="hidden" name="type" value={selectedType} /> : null}
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" name="q" defaultValue={query} placeholder="Search generations" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            name="from"
            defaultValue={from}
            aria-label="Start date"
            className="h-9 w-36 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            name="to"
            defaultValue={to}
            aria-label="End date"
            className="h-9 w-36 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <Button variant="secondary">Apply</Button>
      </form>
    </div>
  );
}
