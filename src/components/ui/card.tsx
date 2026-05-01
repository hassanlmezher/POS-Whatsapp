import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#d9deea] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
