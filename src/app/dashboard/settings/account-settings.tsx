"use client";

import { User } from "@supabase/supabase-js";

interface AccountSettingsProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
    created_at: string;
  } | null;
  user: User | null;
}

export default function AccountSettings({
  profile,
  user,
}: AccountSettingsProps) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
        Account Information
      </h2>

      <div className="space-y-4">
        <div className="flex items-start justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              User ID
            </label>
            <p className="text-sm text-[var(--foreground)] font-mono">
              {profile?.id || user?.id || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Email
            </label>
            <p className="text-sm text-[var(--foreground)]">
              {profile?.email || user?.email || "N/A"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Your email is managed through authentication. Contact support to
              change it.
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Full Name
            </label>
            <p className="text-sm text-[var(--foreground)]">
              {profile?.full_name || "Not set"}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Account Created
            </label>
            <p className="text-sm text-[var(--foreground)]">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between py-3">
          <div>
            <label className="block text-sm font-medium text-[var(--muted)] mb-1">
              Last Sign In
            </label>
            <p className="text-sm text-[var(--foreground)]">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
