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
  ShieldCheck,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  initialError: string | null;
  year: number;
};

const features = [
  {
    title: "WhatsApp Integration",
    description: "Reply to customers and manage orders directly from the POS.",
    icon: Smartphone,
    color: "text-[#22e084]",
    background: "bg-[#11314a]",
  },
  {
    title: "Easy Sales & Checkout",
    description: "Create orders in seconds and close sales effortlessly.",
    icon: ShoppingCart,
    color: "text-[#2e8cff]",
    background: "bg-[#102b4c]",
  },
  {
    title: "Inventory Management",
    description: "Track stock in real-time and never run out again.",
    icon: Box,
    color: "text-[#8a5cff]",
    background: "bg-[#1c254a]",
  },
  {
    title: "Powerful Reports",
    description: "Get insights that help you grow your business.",
    icon: BarChart3,
    color: "text-[#ff9d1c]",
    background: "bg-[#252b37]",
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
    setNotice("Contact your InChouf POS administrator to reset your password.");
  }

  return (
    <main className="grid min-h-dvh overflow-hidden bg-[#f3f5f9] lg:grid-cols-[46%_54%]">
      <section
        aria-label="InChouf POS business management features"
        className="relative hidden min-h-dvh overflow-hidden bg-[#020a18] lg:block"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(10,105,238,0.30),transparent_34%),radial-gradient(circle_at_26%_96%,rgba(12,139,255,0.22),transparent_30%),linear-gradient(135deg,#020711_0%,#03172f_48%,#051d43_100%)]" />
        <div className="absolute -right-28 top-[14%] h-[520px] w-[520px] rounded-full border border-[#136cff]/20" />
        <div className="absolute -right-16 top-[19%] h-[390px] w-[390px] rounded-full border border-[#136cff]/15" />
        <div className="absolute right-12 top-[24%] h-[265px] w-[265px] rounded-full border border-[#136cff]/10" />
        <div className="absolute bottom-0 left-0 right-0 h-[34%] bg-gradient-to-t from-[#020711] via-[#061a34]/72 to-transparent" />

        <div className="relative z-10 flex min-h-dvh flex-col px-[7.8%] pb-6 pt-8">
          <Image
            src="/inchouf-pos-logo.png"
            alt="InChouf POS"
            width={300}
            height={106}
            priority
            className="h-[92px] w-[260px] rounded-lg object-cover object-center drop-shadow-[0_18px_28px_rgba(0,0,0,0.36)]"
          />

          <div className="mt-7 max-w-[560px]">
            <p className="text-[14px] font-medium text-[#c8d3e7]">Smart POS. Smarter Business.</p>
            <h1 className="mt-7 text-[42px] font-bold leading-[1.15] text-white xl:text-[48px]">
              Run your business{" "}
              <span className="text-[#2387ff]">smarter</span>, faster, better.
            </h1>
            <p className="mt-5 max-w-[520px] text-[18px] leading-[1.5] text-[#c8d2e4]">
              Manage sales, WhatsApp orders, inventory, employees and customers - all in one
              powerful POS system.
            </p>
          </div>

          <div className="mt-8 grid max-w-[530px] gap-5">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title} className="flex items-start gap-4">
                  <div
                    className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-lg ${feature.background} ${feature.color} shadow-[0_12px_30px_rgba(0,0,0,0.22)]`}
                  >
                    <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={2.15} />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold leading-tight text-white">
                      {feature.title}
                    </h2>
                    <p className="mt-1 text-[14px] leading-5 text-[#d3d9e5]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mt-auto h-[190px]">
            <div className="absolute bottom-1 left-[11%] h-20 w-28 rounded-lg bg-[#050a12] shadow-[0_24px_42px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mt-3 h-9 w-16 rounded-sm bg-white">
                <div className="mx-auto h-full w-12 bg-[repeating-linear-gradient(to_bottom,#c8d0dc_0,#c8d0dc_2px,transparent_2px,transparent_8px)]" />
              </div>
            </div>
            <div className="absolute bottom-0 left-[30%] h-16 w-[270px] rounded-lg bg-[#050a12] shadow-[0_30px_55px_rgba(0,0,0,0.55)]" />
            <div className="absolute bottom-[58px] left-[27%] h-[124px] w-[315px] rounded-xl border border-white/20 bg-[#0a1020] p-3 shadow-[0_32px_60px_rgba(0,0,0,0.55)]">
              <div className="h-full rounded-md bg-[#f7f9fd] p-4">
                <div className="flex gap-2">
                  <div className="h-6 flex-1 rounded-md bg-[#eaf1ff]" />
                  <div className="h-6 flex-1 rounded-md bg-[#eaf8f0]" />
                  <div className="h-6 flex-1 rounded-md bg-[#fff4e2]" />
                </div>
                <div className="mt-4 h-12 rounded-md bg-[linear-gradient(120deg,transparent_0_12%,#56a3ff_12%_14%,transparent_14%_26%,#56a3ff_26%_28%,transparent_28%_42%,#56a3ff_42%_44%,transparent_44%_100%),linear-gradient(#eef3fb,#eef3fb)]" />
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <span className="h-3 rounded bg-[#dce5f2]" />
                  <span className="h-3 rounded bg-[#dce5f2]" />
                  <span className="h-3 rounded bg-[#dce5f2]" />
                  <span className="h-3 rounded bg-[#dce5f2]" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-2 right-[8%] h-28 w-14 rounded-[28px] bg-[#050a12] shadow-[0_24px_45px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mt-4 h-8 w-14 rounded-full bg-[#121c2d]" />
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh min-w-0 flex-col items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="my-auto w-full max-w-[566px] rounded-lg border border-[#dfe3eb] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(20,39,77,0.10)] sm:px-12 sm:py-11 lg:px-12">
          <div className="text-center">
            <h1 className="text-[28px] font-bold leading-tight text-[#081735] sm:text-[30px]">
              Welcome Back!
            </h1>
            <p className="mt-2 text-[16px] text-[#65718b]">Sign in to continue to InChouf POS</p>
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
          &copy; {year} InChouf POS. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
