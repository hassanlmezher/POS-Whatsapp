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
        className={cn("h-11 w-11 rounded-full object-cover ring-4 ring-[#f3f6fb]", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-[#eaffff] text-sm font-bold text-[#008d99] ring-4 ring-[#f3f6fb]",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
