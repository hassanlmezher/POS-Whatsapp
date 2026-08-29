import type React from "react";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-[#052e1b] text-[#5ee0a0] ring-[#0f6d43]",
  yellow: "bg-[#33240b] text-[#f6c76a] ring-[#8a621f]",
  red: "bg-[#351018] text-[#ff7a94] ring-[#8d2638]",
  slate: "bg-[#10181c] text-[#8fa3ad] ring-[#1d3038]",
  cyan: "bg-[#082529] text-[#22ddeb] ring-[#22ddeb]",
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
