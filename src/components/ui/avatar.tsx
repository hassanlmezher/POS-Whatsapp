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
        className={cn("h-11 w-11 rounded-full object-cover ring-4 ring-[#ffffff]", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-[#f4ecff] text-sm font-bold text-[#7c3aed] ring-4 ring-[#ffffff]",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
