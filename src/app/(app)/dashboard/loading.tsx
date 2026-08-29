export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-8 animate-pulse">
      {/* Header skeleton */}
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="h-10 w-80 rounded-xl bg-[#142126]" />
          <div className="mt-3 h-5 w-64 rounded-lg bg-[#142126]" />
        </div>
        <div className="h-12 w-56 rounded-xl bg-[#142126]" />
      </section>

      {/* Stats cards skeleton */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-h-[178px] rounded-2xl bg-[#070b0d] p-7 shadow-sm">
            <div className="h-3 w-28 rounded bg-[#142126]" />
            <div className="mt-7 h-8 w-36 rounded-lg bg-[#142126]" />
            <div className="mt-3 h-3 w-24 rounded bg-[#142126]" />
          </div>
        ))}
      </section>

      {/* Chart skeleton */}
      <div className="rounded-2xl bg-[#070b0d] p-8 shadow-sm">
        <div className="h-6 w-48 rounded-lg bg-[#142126]" />
        <div className="mt-2 h-4 w-72 rounded bg-[#142126]" />
        <div className="mt-6 h-52 w-full rounded-xl bg-[#142126]" />
      </div>

      {/* Tables skeleton */}
      <section className="grid gap-7 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="rounded-2xl bg-[#070b0d] shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="h-6 w-36 rounded-lg bg-[#142126]" />
          </div>
          <div className="bg-[#0b1114] px-8 py-4">
            <div className="h-3 w-full rounded bg-[#142126]" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-4 gap-4 border-t border-[#142126] px-8 py-5">
              <div className="h-4 rounded bg-[#142126]" />
              <div className="h-4 rounded bg-[#142126]" />
              <div className="h-5 w-16 rounded-full bg-[#142126]" />
              <div className="h-4 w-20 rounded bg-[#142126]" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-[#070b0d] shadow-sm overflow-hidden">
          <div className="border-b border-[#142126] p-6">
            <div className="h-6 w-24 rounded-lg bg-[#142126]" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-[#142126] p-6">
              <div className="h-10 w-10 rounded-full bg-[#142126] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-[#142126]" />
                <div className="h-3 w-48 rounded bg-[#142126]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
