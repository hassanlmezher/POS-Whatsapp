"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
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
    const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({
      password,
    });
    setIsSaving(false);

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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-white">Password</h2>
      </div>

      <label className="block text-sm font-semibold text-white">
        New Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
        />
      </label>

      <label className="block text-sm font-semibold text-white">
        Confirm Password
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
        />
      </label>

      {message ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm text-[#ff9aac]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
