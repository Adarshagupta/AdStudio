"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { createStudioSessionAction } from "@/app/(shell)/studio-pro/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SubmitLabel({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <>{pending ? "Creating..." : children}</>;
}

export function CreateStudioSessionButton({
  children,
  className,
  size = "lg",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  return (
    <form action={createStudioSessionAction}>
      <Button type="submit" size={size} variant={variant} className={cn(className)}>
        <SubmitLabel>{children}</SubmitLabel>
      </Button>
    </form>
  );
}
