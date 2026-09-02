"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, ShoppingBag } from "lucide-react";

export default function OrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[orders] Page render failed", error);

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center p-5 lg:p-8">
      <div className="w-full max-w-lg rounded-lg border border-[#1d3038] bg-[#070b0d] p-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#351018] text-[#ff7a94] ring-1 ring-[#8d2638]">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-black text-[#f8fbff]">Orders could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa3ad]">
          The order was saved, but the order list hit a temporary loading problem.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#22ddeb] px-4 text-sm font-semibold text-black transition hover:bg-[#2ff4ff]"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link
            href="/pos"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-sm font-semibold text-[#f8fbff] transition hover:border-[#22ddeb] hover:text-[#22ddeb]"
          >
            <ShoppingBag className="h-4 w-4" /> Back to POS
          </Link>
        </div>
      </div>
    </div>
  );
}
