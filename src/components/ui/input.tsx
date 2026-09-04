import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: boolean;
};

export function Input({ className, icon, ...props }: InputProps) {
  return (
    <label className="relative block">
      {icon ? (
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#000000]" />
      ) : null}
      <input
        className={cn(
          "h-12 w-full rounded-xl border border-[#d8c3ff] bg-[#ffffff] px-4 text-sm text-[#000000] outline-none transition placeholder:text-[#000000] focus:border-[#7c3aed] focus:bg-[#ffffff] focus:ring-4 focus:ring-[#7c3aed]/15",
          icon && "pl-11",
          className,
        )}
        {...props}
      />
    </label>
  );
}
