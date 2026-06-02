import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AccessDenied({
  title = "Access unavailable",
  message = "Your workspace access does not include this area.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Card className="w-full max-w-md space-y-5 bg-white p-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-medium text-zinc-900">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Back to home</Link>
        </Button>
      </Card>
    </div>
  );
}
