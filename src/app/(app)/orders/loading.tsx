export default function OrdersLoading() {
  return (
    <div className="space-y-7 p-5 lg:p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="h-8 w-40 rounded bg-[#1d3038]" />
          <div className="mt-2 h-4 w-64 rounded bg-[#1d3038]" />
        </div>
        <div className="h-12 w-36 rounded-lg bg-[#1d3038]" />
      </div>

      {/* Stats cards skeleton */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#1d3038] bg-[#0b1114] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="h-3 w-24 rounded bg-[#1d3038]" />
                <div className="mt-5 h-8 w-32 rounded bg-[#1d3038]" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#1d3038]" />
            </div>
            <div className="mt-4 h-4 w-40 rounded bg-[#1d3038]" />
          </div>
        ))}
      </section>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[#1d3038] bg-[#0b1114] overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#1d3038] p-5">
          <div className="h-11 flex-1 rounded-lg bg-[#1d3038]" />
          <div className="h-12 w-32 rounded-lg bg-[#1d3038]" />
          <div className="h-10 w-10 rounded-lg bg-[#1d3038]" />
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 flex-1 rounded bg-[#1d3038]" />
                <div className="h-4 flex-1 rounded bg-[#1d3038]" />
                <div className="h-4 flex-1 rounded bg-[#1d3038]" />
                <div className="h-4 flex-1 rounded bg-[#1d3038]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
