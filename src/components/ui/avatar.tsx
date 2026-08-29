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
        className={cn("h-11 w-11 rounded-full object-cover ring-4 ring-[#0b1114]", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-[#082529] text-sm font-bold text-[#22ddeb] ring-4 ring-[#0b1114]",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
