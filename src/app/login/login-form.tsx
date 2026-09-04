"use client";

import Image from "next/image";
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
} from "lucide-react";
import { LoadingScreen } from "@/components/app/loading-screen";
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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    setLoadingMessage("Signing you in...");

    const supabase = createSupabaseBrowserClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("The email or password you entered is incorrect.");
        setLoadingMessage(null);
        return;
      }

      const contextResponse = await fetch("/api/auth/context", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!contextResponse.ok) {
        const contextError = await contextResponse.json().catch(() => null);
        await supabase.auth.signOut();
        setError(
          contextError?.error === "tenant_suspended"
            ? "This business workspace is suspended. Contact InChouf support."
            : contextResponse.status === 403
            ? "This account is not linked to a business workspace. Contact your administrator."
            : "We could not load your business workspace. Please try again.",
        );
        setLoadingMessage(null);
        return;
      }

      setLoadingMessage("Opening your dashboard...");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Check your connection and try again.");
      setLoadingMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  function showResetHelp() {
    setError(null);
    setNotice("Contact your InChouf POS administrator to reset your password.");
  }

  return (
    <main className="relative flex min-h-dvh overflow-x-hidden bg-[#ffffff]">
      {loadingMessage ? <LoadingScreen message={loadingMessage} /> : null}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.13),transparent_34%),linear-gradient(145deg,#f4ecff_0%,#ffffff_52%,#eadbff_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/70 to-transparent" />

      <section className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[540px] rounded-lg border border-[#d8c3ff] bg-[#fbf8ff]/95 px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur sm:px-10 sm:py-9">
          <div className="text-center">
            <Image
              src="/inchouf-pos-logo.png"
              alt="InChouf POS"
              width={148}
              height={148}
              priority
              className="mx-auto mb-6 h-24 w-24 rounded-lg object-cover ring-1 ring-[#7c3aed]/25 shadow-[0_14px_30px_rgba(124,58,237,0.14)]"
            />
            <h1 className="text-[27px] font-bold leading-tight text-black sm:text-[30px]">
              Welcome Back!
            </h1>
            <p className="mt-2 text-[15px] text-black/58">Sign in to continue to InChouf POS</p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={login}>
            <div className="block text-[14px] font-semibold text-black">
              <label htmlFor="login-email">Email Address</label>
              <span className="relative mt-2 block">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/42"
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
                  className="h-[54px] w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] pl-12 pr-4 text-[15px] font-normal text-black outline-none transition placeholder:text-black/36 focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </span>
            </div>

            <div className="block text-[14px] font-semibold text-black">
              <label htmlFor="login-password">Password</label>
              <span className="relative mt-2 block">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/42"
                  strokeWidth={1.8}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-[54px] w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] pl-12 pr-14 text-[15px] font-normal text-black outline-none transition placeholder:text-black/36 focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-black/48 transition hover:bg-[#f4ecff] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-[14px]">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 font-medium text-black/72">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded border-black/20 accent-[#7c3aed]"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={showResetHelp}
                className="min-h-10 shrink-0 font-medium text-[#7c3aed] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]"
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-[#7c3aed] bg-[#f4ecff] px-4 py-3 text-sm leading-5 text-[#6d28d9]"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-[#7c3aed]/35 bg-[#f4ecff] px-4 py-3 text-sm leading-5 text-black">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-[56px] w-full items-center justify-center gap-4 rounded-lg bg-[#7c3aed] px-5 text-[16px] font-semibold text-black shadow-[0_14px_30px_rgba(124,58,237,0.18)] transition hover:bg-[#6d28d9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c3aed]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4ecff] text-[#7c3aed]">
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </span>
            </button>
          </form>

          <div className="mt-6 flex items-start gap-4 rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed]/15 text-[#7c3aed]">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-black">Secure &amp; Reliable</h2>
              <p className="mt-1 text-[13px] leading-5 text-black/55">
                Your data is protected with enterprise-grade security and encryption.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-5 shrink-0 text-center text-[12px] text-black/42 sm:text-[13px]">
          &copy; {year} InChouf POS. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
