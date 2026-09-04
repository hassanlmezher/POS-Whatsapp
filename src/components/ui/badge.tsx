import type React from "react";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-[#f4ecff] text-[#6d28d9] ring-[#7c3aed]",
  yellow: "bg-[#f4ecff] text-[#6d28d9] ring-[#7c3aed]",
  red: "bg-[#f4ecff] text-[#6d28d9] ring-[#7c3aed]",
  slate: "bg-[#f4ecff] text-[#000000] ring-[#d8c3ff]",
  cyan: "bg-[#f4ecff] text-[#7c3aed] ring-[#7c3aed]",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
