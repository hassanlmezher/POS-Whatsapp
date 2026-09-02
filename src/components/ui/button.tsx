import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "bg-[#22ddeb] text-black shadow-[0_6px_14px_rgba(34,221,235,0.24)] hover:bg-[#2ff4ff]",
  secondary: "border border-[#22ddeb]/55 bg-[#082529] text-[#22ddeb] shadow-[0_6px_14px_rgba(34,221,235,0.14)] hover:bg-[#0b3338]",
  ghost: "bg-transparent text-[#8fa3ad] hover:bg-[#10181c] hover:text-[#22ddeb]",
  outline: "border border-[#1d3038] bg-[#070b0d] text-[#f8fbff] shadow-sm hover:bg-[#0b1114]",
  danger: "bg-[#351018] text-[#ff7a94] hover:bg-[#43131e]",
};

const sizes = {
  sm: "h-9 rounded-lg px-3 text-sm",
  md: "h-12 rounded-lg px-5 text-sm",
  lg: "h-14 rounded-xl px-6 text-base",
  icon: "h-10 w-10 rounded-lg p-0",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
