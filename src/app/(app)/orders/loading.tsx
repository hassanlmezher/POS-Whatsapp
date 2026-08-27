export default function OrdersLoading() {
  return (
    <div className="space-y-6 p-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 rounded-xl bg-[#e8ecf5]" />
        <div className="h-10 w-36 rounded-xl bg-[#e8ecf5]" />
      </div>
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="bg-[#f7f9fc] px-8 py-4">
          <div className="grid grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 rounded bg-[#e8ecf5]" />
            ))}
          </div>
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="grid grid-cols-5 gap-4 border-t border-[#edf1f7] px-8 py-5">
            <div className="h-4 rounded bg-[#e8ecf5]" />
            <div className="h-4 rounded bg-[#e8ecf5]" />
            <div className="h-5 w-20 rounded-full bg-[#e8ecf5]" />
            <div className="h-5 w-16 rounded-full bg-[#e8ecf5]" />
            <div className="h-4 w-16 rounded bg-[#e8ecf5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
