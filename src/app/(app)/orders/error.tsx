"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, ShoppingBag } from "lucide-react";

export default function OrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error("[orders] Page render failed", error);

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center p-5 lg:p-8">
      <div className="w-full max-w-lg rounded-lg border border-[#d8c3ff] bg-[#fbf8ff] p-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#f4ecff] text-[#6d28d9] ring-1 ring-[#7c3aed]">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-black text-[#000000]">Orders could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#000000]">
          The order was saved, but the order list hit a temporary loading problem.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-black transition hover:bg-[#6d28d9]"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <Link
            href="/pos"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-sm font-semibold text-[#000000] transition hover:border-[#7c3aed] hover:text-[#7c3aed]"
          >
            <ShoppingBag className="h-4 w-4" /> Back to POS
          </Link>
        </div>
      </div>
    </div>
  );
}
