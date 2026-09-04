type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[#f4ecff]/80 px-6 text-[#000000] backdrop-blur-sm"
    >
      <div className="flex min-h-14 items-center gap-4 rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] px-5 py-4 shadow-[0_18px_46px_rgba(0,0,0,0.28)]">
        <div
          aria-hidden="true"
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#c4a5ff] border-t-[#7c3aed]"
        />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-5 text-[#000000]">{message}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[#000000]">Processing request.</p>
        </div>
      </div>
    </div>
  );
}
