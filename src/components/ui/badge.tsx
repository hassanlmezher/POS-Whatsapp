import type React from "react";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-[#dcfce7] text-[#15803d] ring-[#bbf7d0]",
  yellow: "bg-[#fff7ed] text-[#c2410c] ring-[#fed7aa]",
  red: "bg-[#ffe4e6] text-[#e11d48] ring-[#fecdd3]",
  slate: "bg-[#eef2f7] text-[#536884] ring-[#d9deea]",
  cyan: "bg-[#eaffff] text-[#008d99] ring-[#a5f3fc]",
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
