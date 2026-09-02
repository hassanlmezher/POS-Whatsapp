export default function InboxLoading() {
  const skeletonBlock = "rounded bg-[#122126]";

  return (
    <div className="flex h-[calc(100vh-98px)] animate-pulse overflow-hidden">
      {/* Conversation list */}
      <div className="w-[340px] flex-shrink-0 border-r border-[#1d3038] bg-[#070b0d]">
        <div className="border-b border-[#1d3038] p-4">
          <div className="h-10 w-full rounded-lg bg-[#122126]" />
        </div>
        <div className="divide-y divide-[#1d3038]">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 flex-shrink-0 rounded-full bg-[#122126]" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className={`h-4 w-28 ${skeletonBlock}`} />
                  <div className={`h-3 w-10 ${skeletonBlock}`} />
                </div>
                <div className={`h-3 w-44 ${skeletonBlock}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message pane */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-4 border-b border-[#1d3038] bg-[#070b0d] px-6 py-4">
          <div className="h-11 w-11 rounded-full bg-[#122126]" />
          <div className="space-y-2">
            <div className={`h-4 w-32 ${skeletonBlock}`} />
            <div className={`h-3 w-24 ${skeletonBlock}`} />
          </div>
        </div>
        <div className="flex-1 space-y-4 bg-[#050809] p-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-12 w-64 rounded-lg bg-[#122126]" />
            </div>
          ))}
        </div>
        <div className="border-t border-[#1d3038] bg-[#070b0d] p-4">
          <div className="h-12 w-full rounded-lg bg-[#122126]" />
        </div>
      </div>
    </div>
  );
}
