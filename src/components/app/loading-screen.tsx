import Image from "next/image";

type LoadingScreenProps = {
  message: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-[#07120f]/96 px-6 text-white"
    >
      <div className="flex w-full max-w-[360px] flex-col items-center text-center">
        <Image
          src="/inchouf-pos-mark.png"
          alt="InChouf POS"
          width={112}
          height={112}
          priority
          className="h-28 w-28 rounded-[22px] bg-black object-cover shadow-[0_24px_70px_rgba(21,224,238,0.20)]"
        />
        <p className="mt-7 text-[22px] font-semibold leading-tight">{message}</p>
        <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
          <div className="h-full w-2/3 rounded-full bg-[#24dce7] shadow-[0_0_24px_rgba(36,220,231,0.7)] animate-[loading-bar_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
