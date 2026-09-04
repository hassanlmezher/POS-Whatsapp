export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 lg:p-8">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-[#102229] ring-1 ring-[#1f3f49]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-lg bg-[#102229] ring-1 ring-[#1f3f49]" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-[#102229] ring-1 ring-[#1f3f49]" />
    </div>
  );
}
