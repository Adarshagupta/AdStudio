"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { authInputClass } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

type AuthPasswordInputProps = {
  id?: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  required?: boolean;
  className?: string;
};

export function AuthPasswordInput({
  id: idProp,
  name,
  placeholder,
  autoComplete,
  autoFocus,
  minLength,
  required = true,
  className,
}: AuthPasswordInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn(
          "flex h-11 w-full rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-[15px] outline-none ring-offset-background transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-violet-200/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          authInputClass,
          "pr-11",
          className,
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(event) => {
          event.preventDefault();
          setVisible((current) => !current);
        }}
        className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
