import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70", className)}
      {...props}
    />
  );
}
