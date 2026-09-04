import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#d8c3ff] bg-[#fbf8ff] shadow-[0_18px_46px_rgba(0,0,0,0.22)]",
        className,
      )}
      {...props}
    />
  );
}
