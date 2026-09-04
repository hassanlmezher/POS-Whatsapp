"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { finishAppProgress, startAppProgress } from "@/components/app/navigation-progress";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    startAppProgress();
    let updateError: { message: string } | null = null;
    try {
      const result = await createSupabaseBrowserClient().auth.updateUser({
        password,
      });
      updateError = result.error;
    } catch (requestError) {
      updateError = {
        message: requestError instanceof Error ? requestError.message : "Password could not be updated.",
      };
    } finally {
      setIsSaving(false);
      finishAppProgress();
    }

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4ecff] text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-black">Password</h2>
      </div>

      <label className="block text-sm font-semibold text-black">
        New Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
        />
      </label>

      <label className="block text-sm font-semibold text-black">
        Confirm Password
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-lg border border-[#d8c3ff] bg-[#ffffff] px-4 text-black outline-none focus:border-[#7c3aed] focus:ring-4 focus:ring-[#7c3aed]/15"
        />
      </label>

      {message ? (
        <div className="rounded-lg border border-[#7c3aed]/35 bg-[#f4ecff] px-4 py-3 text-sm text-black">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-[#7c3aed] bg-[#f4ecff] px-4 py-3 text-sm text-[#6d28d9]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        aria-busy={isSaving}
        className="relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(124,58,237,0.2)] transition hover:bg-[#6d28d9] disabled:cursor-wait disabled:opacity-80"
      >
        <span className="relative z-10">{isSaving ? "Changing password..." : "Change Password"}</span>
        {isSaving ? (
          <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-[#f4ecff]">
            <span className="block h-full w-1/2 animate-[progress-slide_1s_ease-in-out_infinite] bg-[#6d28d9]" />
          </span>
        ) : null}
      </button>
    </form>
  );
}
