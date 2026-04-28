import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("h-11 w-11 rounded-full object-cover ring-2 ring-white", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-2 ring-white",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
