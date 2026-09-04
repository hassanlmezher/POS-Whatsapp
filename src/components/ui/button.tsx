import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "bg-[#7c3aed] text-black shadow-[0_6px_14px_rgba(124,58,237,0.24)] hover:bg-[#6d28d9]",
  secondary: "border border-[#7c3aed]/55 bg-[#f4ecff] text-[#7c3aed] shadow-[0_6px_14px_rgba(124,58,237,0.14)] hover:bg-[#eadbff]",
  ghost: "bg-transparent text-[#000000] hover:bg-[#f4ecff] hover:text-[#7c3aed]",
  outline: "border border-[#d8c3ff] bg-[#fbf8ff] text-[#000000] shadow-sm hover:bg-[#ffffff]",
  danger: "bg-[#f4ecff] text-[#6d28d9] hover:bg-[#eadbff]",
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
