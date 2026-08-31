"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import AccountSettings from "./account-settings";
import PasswordChange from "./password-change";
import NotificationPreferences from "./notification-preferences";
import AccountDeletion from "./account-deletion";
import { ThemeSelector } from "@/components/theme-selector";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  created_at: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/login");
        return;
      }

      if (!mounted) return;
      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      if (!mounted) return;

      setProfile(
        profileData
          ? {
              id: profileData.id,
              full_name: profileData.full_name ?? "",
              email: profileData.email ?? authUser.email ?? "",
              avatar_url: profileData.avatar_url ?? "",
              created_at: profileData.created_at,
            }
          : null,
      );
      setLoading(false);
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-(--background) p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-(--muted)">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-(--background) p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-(--muted) transition-colors hover:text-(--foreground)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-(--foreground) md:text-4xl">
            Settings
          </h1>

          <p className="mt-2 text-(--muted)">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6">
            <ThemeSelector />
          </div>

          <AccountSettings profile={profile} user={user} />

          <PasswordChange />

          <NotificationPreferences userId={user.id} />

          <AccountDeletion userId={user.id} />
        </div>
      </div>
    </main>
  );
}
