export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-8 animate-pulse">
      {/* Header skeleton */}
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="h-10 w-80 rounded-xl bg-[#e8ecf5]" />
          <div className="mt-3 h-5 w-64 rounded-lg bg-[#e8ecf5]" />
        </div>
        <div className="h-12 w-56 rounded-xl bg-[#e8ecf5]" />
      </section>

      {/* Stats cards skeleton */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-h-[178px] rounded-2xl bg-white p-7 shadow-sm">
            <div className="h-3 w-28 rounded bg-[#e8ecf5]" />
            <div className="mt-7 h-8 w-36 rounded-lg bg-[#e8ecf5]" />
            <div className="mt-3 h-3 w-24 rounded bg-[#e8ecf5]" />
          </div>
        ))}
      </section>

      {/* Chart skeleton */}
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="h-6 w-48 rounded-lg bg-[#e8ecf5]" />
        <div className="mt-2 h-4 w-72 rounded bg-[#e8ecf5]" />
        <div className="mt-6 h-52 w-full rounded-xl bg-[#e8ecf5]" />
      </div>

      {/* Tables skeleton */}
      <section className="grid gap-7 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="h-6 w-36 rounded-lg bg-[#e8ecf5]" />
          </div>
          <div className="bg-[#f7f9fc] px-8 py-4">
            <div className="h-3 w-full rounded bg-[#e8ecf5]" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-4 gap-4 border-t border-[#edf1f7] px-8 py-5">
              <div className="h-4 rounded bg-[#e8ecf5]" />
              <div className="h-4 rounded bg-[#e8ecf5]" />
              <div className="h-5 w-16 rounded-full bg-[#e8ecf5]" />
              <div className="h-4 w-20 rounded bg-[#e8ecf5]" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#edf1f7] p-6">
            <div className="h-6 w-24 rounded-lg bg-[#e8ecf5]" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-[#edf1f7] p-6">
              <div className="h-10 w-10 rounded-full bg-[#e8ecf5] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-[#e8ecf5]" />
                <div className="h-3 w-48 rounded bg-[#e8ecf5]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
