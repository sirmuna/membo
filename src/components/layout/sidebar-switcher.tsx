"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface SidebarSwitcherProps {
  collapsed: boolean;
}

export function SidebarSwitcher({ collapsed }: SidebarSwitcherProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch active memberships
  useEffect(() => {
    async function fetchMemberships() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("organisation_memberships")
        .select(
          `
          id,
          organisation_id,
          status,
          organisations (
            id,
            name,
            slug,
            org_type
          ),
          roles (
            code,
            label
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Failed to load switcher organisations:", error);
        return;
      }

      setMemberships(data || []);
      setLoading(false);
    }

    fetchMemberships();
  }, [supabase]);

  // Determine active organization based on path
  useEffect(() => {
    if (memberships.length === 0) {
      setSelectedOrg(null);
      return;
    }

    // Check if path is /dashboard/organizations/{id}
    const match = pathname.match(/^\/dashboard\/organizations\/([a-f\d-]+)/i);
    if (match) {
      const orgId = match[1];
      const current = memberships.find((m) => m.organisation_id === orgId);
      if (current) {
        setSelectedOrg(current);
        return;
      }
    }

    setSelectedOrg(null);
  }, [pathname, memberships]);

  function handleSelect(url: string) {
    setIsOpen(false);
    router.push(url);
  }

  // Get display name or abbreviation
  const getAbbreviation = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div
      className="relative px-3 py-4 border-b border-[var(--border)]"
      ref={dropdownRef}
    >
      {collapsed ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/10 text-[var(--primary)] hover:from-[var(--primary)]/30 hover:to-[var(--primary)]/20 transition-all duration-200 hover:scale-105 font-bold text-sm cursor-pointer shadow-sm border border-[var(--primary)]/20"
          title={
            selectedOrg ? selectedOrg.organisations.name : "Personal Dashboard"
          }
        >
          {selectedOrg ? getAbbreviation(selectedOrg.organisations.name) : "🏠"}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-(--background) transition-all duration-200 hover:scale-[1.02] text-left cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-transform duration-200 hover:scale-110">
              {selectedOrg
                ? getAbbreviation(selectedOrg.organisations.name)
                : "MEM"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate transition-opacity duration-200">
                {selectedOrg
                  ? selectedOrg.organisations.name
                  : "Personal Space"}
              </p>
              <p className="text-xs text-[var(--muted)] truncate transition-opacity duration-200">
                {selectedOrg
                  ? selectedOrg.roles?.label || "Member"
                  : "Personal Dashboard"}
              </p>
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-4 z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 mt-1`}
          style={{ top: "100%" }}
        >
          <div className="px-3 py-1 text-xs font-semibold text-[var(--muted)] tracking-wider">
            WORKSPACES
          </div>

          {/* Personal Space Link */}
          <button
            onClick={() => handleSelect("/dashboard")}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--foreground)] hover:bg-(--background) transition-all duration-200 text-left cursor-pointer ${!selectedOrg ? "bg-[var(--primary)]/5 font-semibold text-[var(--primary)]" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-base">🏠</span> Personal Dashboard
            </span>
            {!selectedOrg && (
              <span className="text-xs font-bold text-[var(--primary)]">
                Active
              </span>
            )}
          </button>

          <div className="my-1 border-t border-[var(--border)]"></div>

          {/* Organisations header */}
          <div className="px-3 py-1 text-xs font-semibold text-[var(--muted)] tracking-wider flex justify-between items-center">
            <span>MY ORGANISATIONS</span>
            {loading && (
              <span className="text-[10px] lowercase text-[var(--muted)]">
                loading...
              </span>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {memberships.length > 0
              ? memberships.map((m) => {
                  const org = m.organisations;
                  const role = m.roles;
                  const isActive =
                    selectedOrg?.organisation_id === m.organisation_id;

                  return (
                    <button
                      key={m.id}
                      onClick={() =>
                        handleSelect(`/dashboard/organizations/${org.id}`)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--foreground)] hover:bg-(--background) transition-all duration-200 text-left cursor-pointer ${isActive ? "bg-[var(--primary)]/5 font-semibold text-[var(--primary)]" : ""}`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-medium">{org.name}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate font-mono">
                          {org.slug}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--border)] text-[var(--muted)]"}`}
                      >
                        {role?.label || "Member"}
                      </span>
                    </button>
                  );
                })
              : !loading && (
                  <div className="px-3 py-2.5 text-xs text-[var(--muted)] text-center">
                    No organisations yet
                  </div>
                )}
          </div>

          <div className="my-1 border-t border-[var(--border)]"></div>

          {/* Create & Join links */}
          <div className="space-y-0.5">
            <button
              onClick={() => handleSelect("/dashboard/organizations/new")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--primary)] hover:bg-(--background) transition-all duration-200 text-left cursor-pointer font-medium"
            >
              <span>＋</span> Create Organisation
            </button>
            <button
              onClick={() => handleSelect("/dashboard/organizations/join")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--primary)] hover:bg-(--background) transition-all duration-200 text-left cursor-pointer font-medium"
            >
              <span>🔍</span> Join Organisation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
