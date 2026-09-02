"use client";

import type React from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  pendingText = "Saving...",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "relative overflow-hidden disabled:cursor-wait disabled:opacity-80",
        className,
      )}
    >
      <span className="relative z-10">{pending ? pendingText : children}</span>
      {pending ? (
        <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-black/15">
          <span className="block h-full w-1/2 animate-[progress-slide_1s_ease-in-out_infinite] bg-white/85" />
        </span>
      ) : null}
    </button>
  );
}
