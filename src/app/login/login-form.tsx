"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError: string | null;
  year: number;
};

export function LoginForm({ initialError, year }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("The email or password you entered is incorrect.");
        return;
      }

      const contextResponse = await fetch("/api/auth/context", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!contextResponse.ok) {
        await supabase.auth.signOut();
        setError(
          contextResponse.status === 403
            ? "This account is not linked to a business workspace. Contact your administrator."
            : "We could not load your business workspace. Please try again.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function showResetHelp() {
    setError(null);
    setNotice("Contact your InChoufPOS administrator to reset your password.");
  }

  return (
    <main className="grid min-h-dvh overflow-hidden bg-[#f3f5f9] lg:grid-cols-[46%_54%]">
      <section
        aria-label="InChoufPOS business management features"
        className="login-hero-reference relative hidden min-h-dvh bg-[#020a18] bg-no-repeat lg:block"
      >
        <span className="sr-only">
          InChoufPOS. Smart POS. Smarter Business. Manage sales, WhatsApp orders, inventory,
          employees, customers, and reports in one business system.
        </span>
      </section>

      <section className="flex min-h-dvh min-w-0 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="my-auto w-full max-w-[566px] rounded-lg border border-[#dfe3eb] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(20,39,77,0.10)] sm:px-12 sm:py-11 lg:px-12">
          <div className="text-center">
            <div className="mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#eef4fc]">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1473ed] text-white shadow-[0_8px_18px_rgba(20,115,237,0.28)]">
                <ShoppingBag aria-hidden="true" className="h-6 w-6" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="mt-5 text-[28px] font-bold leading-tight text-[#081735] sm:text-[30px]">
              Welcome Back!
            </h1>
            <p className="mt-2 text-[16px] text-[#65718b]">Sign in to continue to InChoufPOS</p>
          </div>

          <form className="mt-9 space-y-6" onSubmit={login}>
            <div className="block text-[15px] font-semibold text-[#101d39]">
              <label htmlFor="login-email">Email Address</label>
              <span className="relative mt-2 block">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7d899e]"
                  strokeWidth={1.8}
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-[58px] w-full rounded-lg border border-[#d6dce6] bg-white pl-12 pr-4 text-[16px] font-normal text-[#111b31] outline-none transition placeholder:text-[#8a95a9] focus:border-[#1473ed] focus:ring-4 focus:ring-[#1473ed]/10"
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </span>
            </div>

            <div className="block text-[15px] font-semibold text-[#101d39]">
              <label htmlFor="login-password">Password</label>
              <span className="relative mt-2 block">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7d899e]"
                  strokeWidth={1.8}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-[58px] w-full rounded-lg border border-[#d6dce6] bg-white pl-12 pr-14 text-[16px] font-normal text-[#111b31] outline-none transition placeholder:text-[#8a95a9] focus:border-[#1473ed] focus:ring-4 focus:ring-[#1473ed]/10"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#77839a] transition hover:bg-[#f1f4f8] hover:text-[#1473ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473ed]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-[14px] sm:text-[15px]">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium text-[#26334e]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded border-[#b9c3d3] accent-[#1473ed]"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={showResetHelp}
                className="min-h-11 shrink-0 font-medium text-[#075fe3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1473ed]"
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm leading-5 text-[#a81436]"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm leading-5 text-[#174a92]">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-[60px] w-full items-center justify-center gap-4 rounded-lg bg-[#0869ee] px-5 text-[17px] font-semibold text-white shadow-[0_10px_24px_rgba(8,105,238,0.22)] transition hover:bg-[#005dd8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1473ed]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </span>
            </button>
          </form>

          <div className="mt-8 flex items-start gap-4 rounded-lg bg-[#f3f6fa] px-5 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e0edff] text-[#1473ed]">
              <ShieldCheck aria-hidden="true" className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#12203c]">Secure &amp; Reliable</h2>
              <p className="mt-1 text-[13px] leading-5 text-[#68758e]">
                Your data is protected with enterprise-grade security and encryption.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-8 shrink-0 text-center text-[13px] text-[#68758e] sm:text-[14px]">
          &copy; {year} InChoufPOS. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
