"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface OrganisationNavbarProps {
  organisationId: string;
  userRole?: string;
  activeTab?: string;
}

export function OrganisationNavbar({
  organisationId,
  userRole = "member",
  activeTab,
}: OrganisationNavbarProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [organisation, setOrganisation] = useState<{
    id: string;
    name: string;
    slug: string;
    status: string;
    terminology: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    async function fetchOrganisation() {
      const { data } = await supabase
        .from("organisations")
        .select("*")
        .eq("id", organisationId)
        .single();

      setOrganisation(data);
    }

    fetchOrganisation();
  }, [organisationId, supabase]);

  const orgStatus = organisation?.status || "active";

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    ...(userRole === "owner" || userRole === "admin"
      ? [
          { id: "people-directory", label: "People Directory", icon: "👥" },
          { id: "groups", label: "Groups", icon: "📂" },
          { id: "attendance", label: "Attendance", icon: "📅" },
          { id: "members", label: "Members & Roles", icon: "🔑" },
          { id: "settings", label: "Settings & Profile", icon: "⚙️" },
        ]
      : [
          { id: "groups", label: "My Groups", icon: "📂" },
        ]),
    { id: "notifications", label: "Notifications", icon: "🔔" },
  ];

  const resolvedActiveTab =
    activeTab ||
    (() => {
      if (pathname.includes("/groups")) return "groups";
      if (searchParams.get("tab") === "people") return "people-directory";
      if (pathname.includes("/members/general")) return "people-directory";
      if (pathname.includes("/members")) return "members";
      if (pathname.includes("/settings")) return "settings";
      return "overview";
    })();

  return (
    <>
      {/* Organization Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              {organisation?.name
                ? organisation.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "MEM"}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] truncate">
                {organisation?.name}
              </h1>
              <p className="text-xs text-[var(--muted)] font-mono">
                slug: {organisation?.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <span
              className={[
                "text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border",
                orgStatus === "locked"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
              ].join(" ")}
            >
              {orgStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const isActive = resolvedActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === "groups") {
                      router.push(
                        `/dashboard/organizations/${organisationId}/groups`,
                      );
                      return;
                    }
                    if (tab.id === "people-directory") {
                      router.push(
                        `/dashboard/organizations/${organisationId}?tab=people`,
                      );
                      return;
                    }
                    if (tab.id === "members") {
                      router.push(
                        `/dashboard/organizations/${organisationId}/members`,
                      );
                      return;
                    }
                    if (tab.id === "settings") {
                      router.push(
                        `/dashboard/organizations/${organisationId}/settings`,
                      );
                      return;
                    }
                    router.push(`/dashboard/organizations/${organisationId}`);
                  }}
                  className={[
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-(--background)",
                  ].join(" ")}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
