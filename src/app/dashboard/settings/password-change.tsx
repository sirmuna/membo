"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PasswordChange() {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    // Validation
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect.");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-(--border bg-(--surface) p-6">
      <h2 className="text-lg font-semibold text-(--foreground) mb-2">
        Change Password
      </h2>

      <p className="text-sm text-(--muted) mb-6">
        Update your password to keep your account secure.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-(--foreground) mb-2"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-(--border) px-4 py-2.5 text-(--foreground) bg-(--background) focus:border-(--primary)] focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-(--foreground)] mb-2"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-(--border) px-4 py-2.5 text-(--foreground) bg-(--background) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
          <p className="mt-1 text-xs text-(--muted)">
            Must be at least 6 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-(--foreground) mb-2"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-(--border) px-4 py-2.5 text-(--foreground) bg-(--background) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-(--error)/20 bg-(--error)/5 p-4 text-sm text-(--error)">
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
          <div className="rounded-lg border border-(--success)/20 bg-(--success)/5 p-4 text-sm text-(--success)">
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
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-(--primary) px-4 py-2.5 text-sm font-medium text-white hover:bg-(--primary-dark) disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}
