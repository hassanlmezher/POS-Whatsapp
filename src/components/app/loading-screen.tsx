type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-white/90 px-6 text-[#101828] backdrop-blur-sm"
    >
      <div className="flex min-h-14 items-center gap-4 rounded-lg border border-[#d8dee8] bg-white px-5 py-4 shadow-[0_14px_36px_rgba(16,24,40,0.12)]">
        <div
          aria-hidden="true"
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#d0d7e2] border-t-[#22ddeb]"
        />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-5 text-[#101828]">{message}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[#667085]">Processing request.</p>
        </div>
      </div>
    </div>
  );
}
