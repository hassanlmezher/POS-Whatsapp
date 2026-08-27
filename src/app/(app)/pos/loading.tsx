export default function POSLoading() {
  return (
    <div className="flex h-[calc(100vh-98px)] animate-pulse overflow-hidden">
      {/* Product grid */}
      <div className="flex-1 overflow-hidden p-6">
        {/* Category bar */}
        <div className="mb-6 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 rounded-full bg-[#e8ecf5]" />
          ))}
        </div>
        {/* Product cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="h-36 bg-[#e8ecf5]" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[#e8ecf5]" />
                <div className="h-4 w-1/2 rounded bg-[#e8ecf5]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-[360px] flex-shrink-0 border-l border-[#d9deea] bg-white">
        <div className="border-b border-[#d9deea] p-5">
          <div className="h-6 w-24 rounded-lg bg-[#e8ecf5]" />
        </div>
        <div className="flex-1 p-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-[#e8ecf5]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-[#e8ecf5]" />
                <div className="h-3 w-16 rounded bg-[#e8ecf5]" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#d9deea] p-5 space-y-3">
          <div className="h-4 w-full rounded bg-[#e8ecf5]" />
          <div className="h-4 w-full rounded bg-[#e8ecf5]" />
          <div className="h-12 w-full rounded-xl bg-[#e8ecf5]" />
        </div>
      </div>
    </div>
  );
}
