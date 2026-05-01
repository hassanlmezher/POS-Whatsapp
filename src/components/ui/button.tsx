import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "bg-[#0b4edb] text-white shadow-[0_6px_14px_rgba(11,78,219,0.2)] hover:bg-[#0642c4]",
  secondary: "bg-[#0f172a] text-white hover:bg-[#1f2937]",
  ghost: "bg-transparent text-[#536884] hover:bg-[#f4f6fa] hover:text-[#0b4edb]",
  outline: "border border-[#d9deea] bg-white text-[#0f172a] shadow-sm hover:bg-[#f8fafc]",
  danger: "bg-[#fff1f2] text-[#be123c] hover:bg-[#ffe4e6]",
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
