"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Box,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { LoadingScreen } from "@/components/app/loading-screen";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError: string | null;
  year: number;
};

const features = [
  {
    title: "WhatsApp Integration",
    description: "Manage customer conversations and orders from one inbox.",
    icon: MessageCircle,
  },
  {
    title: "Fast Checkout",
    description: "Create clean sales flows built for busy retail counters.",
    icon: ShoppingCart,
  },
  {
    title: "Inventory Control",
    description: "Keep products, stock, and reorder signals in sync.",
    icon: Box,
  },
  {
    title: "Live Reporting",
    description: "See sales, order volume, and performance at a glance.",
    icon: BarChart3,
  },
];

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
        await supabase.auth.signOut();
        setError(
          contextResponse.status === 403
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
    <main className="fixed inset-0 grid overflow-hidden bg-[#030607] lg:grid-cols-[46%_54%]">
      {loadingMessage ? <LoadingScreen message={loadingMessage} /> : null}

      <section
        aria-label="InChouf POS business management features"
        className="relative hidden h-dvh overflow-hidden bg-black lg:block"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(34,245,255,0.12),transparent_30%),linear-gradient(145deg,#000_0%,#020809_48%,#000_100%)]" />
        <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full border border-[#22f5ff]/12" />
        <div className="absolute -right-14 top-36 h-[310px] w-[310px] rounded-full border border-[#22f5ff]/10" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#22f5ff]/80 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-center px-10 py-6 xl:px-14">
          <Image
            src="/inchouf-pos-logo.png"
            alt="InChouf POS"
            width={320}
            height={240}
            priority
            className="h-auto w-[140px] shrink-0 object-contain drop-shadow-[0_18px_34px_rgba(34,245,255,0.20)] xl:w-[165px]"
          />

          <div className="mt-5 max-w-[620px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#22f5ff]">
              Smart POS. Smarter Business.
            </p>
            <h1 className="mt-4 text-[36px] font-bold leading-[1.05] text-white xl:text-[44px]">
              Run your business{" "}
              <span className="text-[#22f5ff]">smarter</span>, faster, better.
            </h1>
            <p className="mt-4 max-w-[520px] text-[14px] leading-[1.5] text-white/68 xl:text-[15px]">
              Manage sales, WhatsApp orders, inventory, employees and customers in one powerful POS
              workspace.
            </p>
          </div>

          <div className="mt-6 grid max-w-[620px] grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-lg border border-white/10 bg-white/[0.045] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#22f5ff]/35 bg-[#22f5ff]/10 text-[#22f5ff]">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.1} />
                  </div>
                  <h2 className="mt-2 text-[14px] font-bold leading-tight text-white">
                    {feature.title}
                  </h2>
                  <p className="mt-1 text-[12px] leading-[1.35] text-white/58">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 h-px max-w-[620px] bg-gradient-to-r from-[#22f5ff]/80 via-white/20 to-transparent" />
        </div>
      </section>

      <section className="flex h-dvh min-w-0 flex-col items-center justify-center overflow-hidden border-l border-white/10 bg-[#050809] px-5 py-5 sm:px-8 lg:px-12">
        <div className="my-auto w-full max-w-[540px] rounded-lg border border-white/10 bg-[#070b0d] px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:px-10 sm:py-9">
          <div className="text-center">
            <Image
              src="/inchouf-pos-logo.png"
              alt="InChouf POS"
              width={120}
              height={120}
              priority
              className="mx-auto mb-5 h-20 w-20 rounded-lg object-cover ring-1 ring-[#22ddeb]/25 shadow-[0_14px_30px_rgba(34,221,235,0.14)] lg:hidden"
            />
            <h1 className="text-[27px] font-bold leading-tight text-white sm:text-[30px]">
              Welcome Back!
            </h1>
            <p className="mt-2 text-[15px] text-white/58">Sign in to continue to InChouf POS</p>
          </div>

          <form className="mt-7 space-y-5" onSubmit={login}>
            <div className="block text-[14px] font-semibold text-white">
              <label htmlFor="login-email">Email Address</label>
              <span className="relative mt-2 block">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/42"
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
                  className="h-[54px] w-full rounded-lg border border-white/12 bg-[#0b1114] pl-12 pr-4 text-[15px] font-normal text-white outline-none transition placeholder:text-white/36 focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </span>
            </div>

            <div className="block text-[14px] font-semibold text-white">
              <label htmlFor="login-password">Password</label>
              <span className="relative mt-2 block">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/42"
                  strokeWidth={1.8}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-[54px] w-full rounded-lg border border-white/12 bg-[#0b1114] pl-12 pr-14 text-[15px] font-normal text-white outline-none transition placeholder:text-white/36 focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/48 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22ddeb]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-[14px]">
              <label className="flex min-h-10 cursor-pointer items-center gap-3 font-medium text-white/72">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded border-white/20 accent-[#22ddeb]"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={showResetHelp}
                className="min-h-10 shrink-0 font-medium text-[#22ddeb] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22ddeb]"
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm leading-5 text-[#ff9aac]"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm leading-5 text-white">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-[56px] w-full items-center justify-center gap-4 rounded-lg bg-[#22ddeb] px-5 text-[16px] font-semibold text-black shadow-[0_14px_30px_rgba(34,221,235,0.18)] transition hover:bg-[#2ff4ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#22ddeb]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[#22ddeb]">
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </span>
            </button>
          </form>

          <div className="mt-6 flex items-start gap-4 rounded-lg border border-white/10 bg-white/[0.035] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22ddeb]/15 text-[#22ddeb]">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-white">Secure &amp; Reliable</h2>
              <p className="mt-1 text-[13px] leading-5 text-white/55">
                Your data is protected with enterprise-grade security and encryption.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-5 shrink-0 text-center text-[12px] text-white/42 sm:text-[13px]">
          &copy; {year} InChouf POS. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
