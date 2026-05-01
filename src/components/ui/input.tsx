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
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8090aa]" />
      ) : null}
      <input
        className={cn(
          "h-12 w-full rounded-xl border border-[#d9deea] bg-[#f7f9fc] px-4 text-sm text-[#0f172a] outline-none transition placeholder:text-[#65758f] focus:border-[#0b4edb] focus:bg-white focus:ring-4 focus:ring-[#0b4edb]/10",
          icon && "pl-11",
          className,
        )}
        {...props}
      />
    </label>
  );
}
