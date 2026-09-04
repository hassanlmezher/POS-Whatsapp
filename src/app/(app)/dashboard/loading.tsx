export default function DashboardLoading() {
  const skeletonBlock = "rounded bg-[#efe3ff]";

  return (
    <div className="space-y-8 p-8 animate-pulse">
      {/* Header skeleton */}
      <section className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="h-10 w-80 rounded-xl bg-[#efe3ff]" />
          <div className="mt-3 h-5 w-64 rounded-lg bg-[#efe3ff]" />
        </div>
        <div className="h-12 w-56 rounded-lg border border-[#d8c3ff] bg-[#fbf8ff]" />
      </section>

      {/* Stats cards skeleton */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="min-h-[178px] rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] p-7 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <div className={`h-3 w-28 ${skeletonBlock}`} />
            <div className={`mt-7 h-8 w-36 rounded-lg bg-[#efe3ff]`} />
            <div className={`mt-3 h-3 w-24 ${skeletonBlock}`} />
          </div>
        ))}
      </section>

      {/* Chart skeleton */}
      <div className="rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] p-8 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="h-6 w-48 rounded-lg bg-[#efe3ff]" />
        <div className={`mt-2 h-4 w-72 ${skeletonBlock}`} />
        <div className="mt-6 h-52 w-full rounded-lg bg-[#ffffff] ring-1 ring-[#d8c3ff]" />
      </div>

      {/* Tables skeleton */}
      <section className="grid gap-7 xl:grid-cols-[minmax(0,2fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="p-6">
            <div className="h-6 w-36 rounded-lg bg-[#efe3ff]" />
          </div>
          <div className="border-y border-[#d8c3ff] bg-[#ffffff] px-8 py-4">
            <div className={`h-3 w-full ${skeletonBlock}`} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-4 gap-4 border-t border-[#d8c3ff] px-8 py-5">
              <div className={`h-4 ${skeletonBlock}`} />
              <div className={`h-4 ${skeletonBlock}`} />
              <div className="h-5 w-16 rounded-full bg-[#efe3ff]" />
              <div className={`h-4 w-20 ${skeletonBlock}`} />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="border-b border-[#d8c3ff] p-6">
            <div className="h-6 w-24 rounded-lg bg-[#efe3ff]" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-[#d8c3ff] p-6">
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#efe3ff]" />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-32 ${skeletonBlock}`} />
                <div className={`h-3 w-48 ${skeletonBlock}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
