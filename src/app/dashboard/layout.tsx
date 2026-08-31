"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToastContainer } from "@/components/toast";
import { SidebarSwitcher } from "@/components/layout/sidebar-switcher";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/organizations",
    label: "Organizations",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    ),
    hasSubItems: true,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState(0);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  type Organisation = {
    id: string;
    name: string;
    slug: string;
  };

  type OrganisationMembership = {
    organisation_id: string;
    organisations: Organisation | null;
  };

  const [organizations, setOrganizations] = useState<OrganisationMembership[]>(
    [],
  );
  const [orgExpanded, setOrgExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Start loading progress immediately on pathname change
    setTimeout(() => {
      setIsLoading(true);
      setProgress(10);
    }, 0);

    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // More aggressive initial progress, then slow down
        const increment = prev < 30 ? Math.random() * 20 : Math.random() * 8;
        return Math.min(prev + increment, 90);
      });
    }, 100);

    // Complete loading after page transition
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 300);
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && mounted) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (mounted) {
          setProfile(data);
        }
      }
    }

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchOrganizations() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("fetchOrganizations - user:", user);

      if (!user || !mounted) return;

      const { data, error } = await supabase
        .from("organisation_memberships")
        .select(
          `
      organisation_id,
      organisations (
        id,
        name,
        slug
      )
    `,
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      console.log("fetchOrganizations - data:", data);
      console.log("fetchOrganizations - error:", error);

      if (!mounted) return;

      const normalizedOrgs: OrganisationMembership[] = (data ?? []).map(
        (item) => ({
          organisation_id: item.organisation_id,
          organisations: Array.isArray(item.organisations)
            ? (item.organisations[0] ?? null)
            : item.organisations,
        }),
      );

      console.log("fetchOrganizations - normalizedOrgs:", normalizedOrgs);

      setOrganizations(normalizedOrgs);
    }

    fetchOrganizations();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out failed:", error);
      setSigningOut(false);
      return;
    }

    router.replace("/auth/login");
    router.refresh();
  }

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    index: number,
  ) => {
    setHoveredIndex(index);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipTop(rect.top + rect.height / 2);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const isOrgActive = (orgId: string) => {
    return pathname.startsWith(`/dashboard/organizations/${orgId}`);
  };

  const isOrganizationsActive = pathname.startsWith("/dashboard/organizations");

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      {/* Page Loading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-(--border) z-50">
        <div
          className="h-full bg-linear-to-r from-(--primary) via-(--primary-light) to-(--primary) shadow-lg"
          style={{
            width: `${progress}%`,
            opacity: isLoading ? 1 : 0,
            transition: `width 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out`,
          }}
        ></div>
      </div>
      <div className="flex min-h-screen">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-(--border) bg-(--surface) shadow-lg transition-all duration-300 ease-in-out",
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
            sidebarCollapsed ? "w-24" : "w-72",
          ].join(" ")}
        >
          <div
            className={[
              "sticky top-0 flex h-20 items-center border-b border-(--border) bg-(--surface) z-10",
              sidebarCollapsed ? "justify-center px-2" : "justify-between px-4",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--background) shrink-0">
                <Image
                  src="/images/logo-icon.jpg"
                  alt="Membo logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  priority
                />
              </div>
              {!sidebarCollapsed && (
                <span className="text-sm font-semibold text-(--foreground) whitespace-nowrap">
                  Membo
                </span>
              )}
            </div>

            {/* Collapse Button at Edge */}
            <button
              type="button"
              className="hidden absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-10 items-center justify-center rounded-r-lg border border-(--border) bg-(--surface) text-(--foreground) lg:inline-flex hover:bg-(--background) transition-all duration-200 hover:scale-105 z-20"
              aria-label="Collapse sidebar"
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              <svg
                className="w-4 h-4 transition-transform duration-200"
                style={{
                  transform: sidebarCollapsed
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          <SidebarSwitcher collapsed={sidebarCollapsed} />

          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {navItems.map((item, index) => {
              const active = pathname === item.href;

              const getActiveStyle = () => {
                const isParent = item.href === "/dashboard";
                const borderWidth = isParent ? "border-l-4" : "border-l-2";
                const bgClass = isParent
                  ? "bg-(--primary)/5"
                  : "bg-transparent";

                return active
                  ? `${borderWidth} border-(--primary) text-(--primary) ${bgClass} font-semibold`
                  : "text-(--foreground) hover:bg-(--background) border-l-2 border-transparent";
              };

              const isOrgsItem = item.href === "/dashboard/organizations";
              const orgsActive =
                isOrganizationsActive &&
                !isOrgActive(
                  item.href
                    .replace("/dashboard/organizations", "")
                    .split("/")[1],
                );

              return (
                <div
                  key={item.href}
                  className="group relative"
                  data-nav-index={index}
                  onMouseEnter={(e) => handleMouseEnter(e, index)}
                  onMouseLeave={handleMouseLeave}
                >
                  {isOrgsItem ? (
                    <button
                      onClick={() => {
                        if (!sidebarCollapsed) {
                          setOrgExpanded(!orgExpanded);
                        }
                      }}
                      className={[
                        "w-full flex items-center gap-3 rounded-r-xl px-3 py-2.5 text-sm transition-all duration-200 hover:scale-[1.02]",
                        orgsActive
                          ? "border-l-2 border-(--primary) text-(--primary) bg-(--primary)/5 font-semibold"
                          : "text-(--foreground) hover:bg-(--background) border-l-2 border-transparent",
                        sidebarCollapsed ? "justify-center px-2" : "",
                      ].join(" ")}
                    >
                      <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {typeof item.icon === "string" ? (
                          <span className="text-lg leading-none">
                            {item.icon}
                          </span>
                        ) : (
                          item.icon
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="transition-opacity duration-200 flex-1 text-left">
                            {item.label}
                          </span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${orgExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={[
                        "w-full flex items-center gap-3 rounded-r-xl px-3 py-2.5 text-sm transition-all duration-200 hover:scale-[1.02]",
                        getActiveStyle(),
                        sidebarCollapsed ? "justify-center px-2" : "",
                      ].join(" ")}
                    >
                      <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {typeof item.icon === "string" ? (
                          <span className="text-lg leading-none">
                            {item.icon}
                          </span>
                        ) : (
                          item.icon
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="transition-opacity duration-200 flex-1 text-left">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )}
                  {sidebarCollapsed && hoveredIndex === index && (
                    <div
                      className="fixed opacity-100 pointer-events-auto transition-opacity duration-200 z-50 animate-in fade-in slide-in-from-left-2"
                      style={{
                        left: "calc(96px + 0.5rem)",
                        top: `${tooltipTop}px`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      <div className="bg-(--foreground) text-(--surface) text-xs font-medium px-2 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                        {item.label}
                        <div
                          className="absolute right-full w-1.5 h-1.5 bg-(--foreground) -mr-0.5 top-1/2 -translate-y-1/2"
                          style={{
                            clipPath: "polygon(100% 0%, 0% 50%, 100% 100%)",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Organization sub-items */}
                  {isOrgsItem && orgExpanded && !sidebarCollapsed && (
                    <div className="ml-4 mt-1 space-y-1">
                      {organizations.map((org) => (
                        <Link
                          key={org.organisation_id}
                          href={`/dashboard/organizations/${org.organisation_id}`}
                          className={`flex items-center gap-2 rounded-r-lg px-3 py-2 text-sm transition-all duration-200 hover:scale-[1.02] ${
                            isOrgActive(org.organisation_id)
                              ? "border-l-2 border-(--primary) text-(--primary) bg-(--primary)/5 font-semibold"
                              : "text-(--foreground) hover:bg-(--background) border-l-2 border-transparent"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-(--primary)/30"></span>
                          <span className="truncate">
                            {org.organisations?.name}
                          </span>
                        </Link>
                      ))}
                      {organizations.length === 0 && (
                        <div className="px-3 py-2 text-xs text-(--muted)">
                          No organizations yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="sticky bottom-0 border-t border-(--border) bg-(--surface) p-3">
            <div
              className="relative group"
              onMouseEnter={(e) => handleMouseEnter(e, navItems.length)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label={signingOut ? "Signing out" : "Sign out"}
                className={[
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-(--error) transition-all duration-200 hover:bg-(--background) hover:scale-[1.02] disabled:cursor-wait disabled:opacity-60",
                  sidebarCollapsed ? "justify-center px-2" : "",
                ].join(" ")}
              >
                <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                  {signingOut ? (
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  )}
                </div>

                {!sidebarCollapsed && (
                  <span className="transition-opacity duration-200">
                    {signingOut ? "Signing out..." : "Sign out"}
                  </span>
                )}
              </button>

              {sidebarCollapsed && hoveredIndex === navItems.length && (
                <div
                  className="fixed opacity-100 pointer-events-auto transition-opacity duration-200 z-50 animate-in fade-in slide-in-from-left-2"
                  style={{
                    left: "calc(96px + 0.5rem)",
                    top: `${tooltipTop}px`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <div className="bg-(--foreground) text-(--surface) text-xs font-medium px-2 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Sign out
                    <div
                      className="absolute right-full w-1.5 h-1.5 bg-(--foreground) -mr-0.5 top-1/2 -translate-y-1/2"
                      style={{
                        clipPath: "polygon(100% 0%, 0% 50%, 100% 100%)",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-black/20 lg:hidden backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={[
            "flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:pl-24" : "lg:pl-72",
          ].join(" ")}
        >
          <header className="sticky top-0 z-20 border-b border-(--border) bg-(--surface)/90 backdrop-blur-sm transition-all duration-300">
            <div className="flex h-20 items-center justify-between px-4 md:px-6">
              <button
                type="button"
                aria-label="Open sidebar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-(--border) bg-(--surface) text-(--foreground) lg:hidden hover:bg-(--background) transition-all duration-200 hover:scale-105 active:scale-95"
                onClick={() => setSidebarOpen((value) => !value)}
              >
                <svg
                  className="w-5 h-5 transition-transform duration-200"
                  style={{
                    transform: sidebarOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 rounded-lg hover:bg-(--background) transition-all duration-200 hover:scale-[1.02] px-3 py-2 ml-auto"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover border border-(--border) transition-transform duration-200 hover:scale-105"
                    onError={() => {
                      setProfile((prev) =>
                        prev ? { ...prev, avatar_url: "" } : null,
                      );
                    }}
                  />
                ) : null}
                <div
                  className={`h-10 w-10 rounded-full bg-(--primary)/10 flex items-center justify-center border border-(--border) transition-transform duration-200 hover:scale-105 ${profile?.avatar_url ? "hidden" : ""}`}
                >
                  <svg
                    className="h-5 w-5 text-(--primary)"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-(--foreground)">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-xs text-(--muted)">View profile</p>
                </div>
              </Link>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
