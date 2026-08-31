"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FeaturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-(--background) p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-(--muted)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--background) p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-(--foreground)">Features</h1>

          <p className="mt-2 text-(--muted)">
            Explore and manage MEMBO features for your organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Organization Management */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              Organization Management
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              Create and manage organizations with roles and permissions.
            </p>

            <span className="text-xs font-medium text-(--primary)">
              Available
            </span>
          </div>

          {/* Group Management */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              Group Management
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              Create groups and assign members from the general list.
            </p>

            <span className="text-xs font-medium text-(--primary)">
              Available
            </span>
          </div>

          {/* Attendance Tracking */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              Attendance Tracking
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              Track attendance for sessions and events.
            </p>

            <span className="text-xs font-medium text-(--muted)">
              Coming Soon
            </span>
          </div>

          {/* Analytics & Reports */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              Analytics & Reports
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              View analytics and generate reports for your organization.
            </p>

            <span className="text-xs font-medium text-(--muted)">
              Coming Soon
            </span>
          </div>

          {/* General Members List */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 10v4.172a2.032 2.032 0 01-.405 1.405L9 17h5zm-6 0H5l-1.405-1.405A2.032 2.032 0 012 14.158V11a6.002 6.002 0 014-5.659V5a2 2 0 10-4 0v.341C2.67 6.165 4 8.388 4 10v4.172a2.032 2.032 0 01.405 1.405L9 17H3z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              General Members List
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              Add members to a general pool for group leaders to assign.
            </p>

            <span className="text-xs font-medium text-(--primary)">
              Available
            </span>
          </div>

          {/* Messaging & Communication */}
          <div className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-(--primary)/10">
              <svg
                className="h-6 w-6 text-(--primary)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
              Messaging & Communication
            </h3>

            <p className="mb-4 text-sm text-(--muted)">
              Send messages and announcements to your organization.
            </p>

            <span className="text-xs font-medium text-(--muted)">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
