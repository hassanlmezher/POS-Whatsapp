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
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f858f]" />
      ) : null}
      <input
        className={cn(
          "h-12 w-full rounded-xl border border-[#1d3038] bg-[#0b1114] px-4 text-sm text-[#f8fbff] outline-none transition placeholder:text-[#7e929c] focus:border-[#22ddeb] focus:bg-[#0e171b] focus:ring-4 focus:ring-[#22ddeb]/15",
          icon && "pl-11",
          className,
        )}
        {...props}
      />
    </label>
  );
}
