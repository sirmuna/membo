"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AccountDeletionProps {
  userId: string;
}

export default function AccountDeletion({ userId }: AccountDeletionProps) {
  const supabase = createClient();
  const router = useRouter();

  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleDeleteAccount() {
    if (confirmation !== "DELETE") {
      setError("Please type DELETE to confirm.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Delete user account and handle organisation ownership transfers/locks via RPC
      const { error } = await supabase.rpc("delete_own_account");

      if (error) {
        throw error;
      }

      setMessage("Account deletion initiated. You will be redirected shortly.");

      // Sign out and redirect after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete account.",
      );
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border-2 border-[var(--error)]/20 bg-[var(--error)]/5 p-6">
      <h2 className="text-lg font-semibold text-[var(--error)] mb-2">
        Delete Account
      </h2>

      <p className="text-sm text-[var(--error)]/80 mb-6">
        Permanently delete your account and all associated data. This action
        cannot be undone.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--surface)] p-4">
          <h3 className="text-sm font-medium text-[var(--error)]">Warning</h3>
          <ul className="mt-2 space-y-1 text-xs text-[var(--error)]/80">
            <li>• All your profile data will be deleted</li>
            <li>• Your organisation memberships will be removed</li>
            <li>• Any data you created will be affected</li>
            <li>• This action is irreversible</li>
          </ul>
        </div>

        <div>
          <label
            htmlFor="confirmation"
            className="block text-sm font-medium text-[var(--foreground)] mb-2"
          >
            Type DELETE to confirm
          </label>
          <input
            id="confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--foreground)] bg-(--background) focus:border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/20 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/10 p-4 text-sm text-[var(--error)]">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/5 p-4 text-sm text-[var(--success)]">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {message}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={loading || confirmation !== "DELETE"}
          className="w-full rounded-lg bg-[var(--error)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--error)]/90 disabled:opacity-50 disabled:hover:bg-[var(--error)] transition-colors"
        >
          {loading ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </section>
  );
}
