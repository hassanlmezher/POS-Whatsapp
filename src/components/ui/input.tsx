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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      ) : null}
      <input
        className={cn(
          "h-11 w-full rounded-xl border border-transparent bg-[#eef2ff] px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100",
          icon && "pl-10",
          className,
        )}
        {...props}
      />
    </label>
  );
}
