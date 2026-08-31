"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MembersTab } from "./members-tab";
import { SettingsTab } from "./settings-tab";
import { PeopleTab } from "./people-tab";
import { AttendanceTab } from "./attendance-tab";
import { DuplicateAlerts } from "./duplicate-alerts";

interface OrganisationDashboardProps {
  organisationId: string;
  transferId?: string;
  initialTab?: string;
}

interface Role {
  id: string;
  code: string;
  label: string;
}

interface Membership {
  id: string;
  organisation_id: string;
  user_id: string;
  role_id: string | null;
  status: string;
  joined_at: string | null;
  roles: Role | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Organisation {
  id: string;
  name: string;
  slug: string | null;
  status?: string | null;
  terminology?: Record<string, string> | null;
  [key: string]: unknown;
}

interface DashboardNextEvent {
  id: string;
  organisation_id: string;
  group_id: string | null;
  title: string;
  date: string;
  type: string | null;
}

interface DashboardStats {
  memberCount: number;
  groupCount: number;
  attendanceRate: number;
  nextEvent: DashboardNextEvent | null;
}

interface RecentActivity {
  type: "new_member";
  text: string;
  date: string;
}

interface TransferSender {
  id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface OwnershipTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  updated_at?: string | null;
  sender?: TransferSender | null;
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`bg-(--border) rounded ${className}`} />;
}

function DashboardSkeleton({ isManager }: { isManager: boolean }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl p-6 md:p-8 border border-(--border) bg-(--surface) shadow-sm space-y-3 max-w-xl">
        <SkeletonLine className="h-7 w-56" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-3/4" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-(--surface) p-5 rounded-xl border border-(--border) shadow-sm space-y-2"
          >
            <SkeletonLine className="h-3 w-20" />
            <SkeletonLine className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Recent Activity + Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="md:col-span-2 bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonLine className="h-4 w-32" />

          <div className="space-y-4 pt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-(--border) shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-3/4" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
                <SkeletonLine className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonLine className="h-4 w-28" />

          <div className="space-y-2 pt-1">
            {/* Managers see 4 quick links, non-managers see 2 —
                matches the isManager branch in the real Quick Links panel. */}
            {Array.from({ length: isManager ? 4 : 2 }).map((_, i) => (
              <SkeletonLine key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrganisationDashboard({
  organisationId,
  transferId,
  initialTab,
}: OrganisationDashboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Core state
  // ---------------------------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [showCompactHeader, setShowCompactHeader] = useState(false);

  // ---------------------------------------------------------------------------
  // Dashboard data
  // ---------------------------------------------------------------------------

  const [stats, setStats] = useState<DashboardStats>({
    memberCount: 0,
    groupCount: 0,
    attendanceRate: 0,
    nextEvent: null,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // ---------------------------------------------------------------------------
  // Ownership transfer state
  // ---------------------------------------------------------------------------

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] =
    useState<OwnershipTransfer | null>(null);
  const [transferProcessing, setTransferProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Profile state
  // ---------------------------------------------------------------------------

  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ---------------------------------------------------------------------------
  // Synchronise active tab with route-provided initial tab
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ---------------------------------------------------------------------------
  // Scroll detection for compact header
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowCompactHeader(scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning") => {
      if (typeof window !== "undefined") {
        window.addToast?.(message, type);
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Fetch dashboard data
  // ---------------------------------------------------------------------------

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Failed to get authenticated user:", authError);
      }

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserEmail(user.email || "");

      // 2. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load user profile:", profileError);
      }

      if (profile) {
        const resolvedProfile: UserProfile = {
          id: profile.id,
          full_name: profile.full_name ?? null,
          email: profile.email ?? user.email ?? null,
          avatar_url: profile.avatar_url ?? null,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };

        setUserProfile(resolvedProfile);
        setProfileName(resolvedProfile.full_name || "");
      } else {
        setUserProfile(null);
        setProfileName("");
      }

      // 3. Fetch active membership
      const { data: membershipData, error: membershipError } = await supabase
        .from("organisation_memberships")
        .select(
          `
              id,
              organisation_id,
              user_id,
              role_id,
              status,
              joined_at
            `,
        )
        .eq("organisation_id", organisationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) {
        console.error(
          "Failed to load organisation membership:",
          membershipError,
        );
      }

      if (membershipError || !membershipData) {
        showToast("You do not have access to this organisation.", "error");

        router.push("/dashboard");
        return;
      }

      // 4. Fetch role
      let roleData: Role | null = null;

      if (membershipData.role_id) {
        const { data: fetchedRole, error: roleError } = await supabase
          .from("roles")
          .select("id, code, label")
          .eq("id", membershipData.role_id)
          .maybeSingle();

        if (roleError) {
          console.error("Failed to load membership role:", roleError);
        }

        if (fetchedRole) {
          roleData = fetchedRole as Role;
        }
      }

      const resolvedMembership: Membership = {
        id: membershipData.id,
        organisation_id: membershipData.organisation_id,
        user_id: membershipData.user_id,
        role_id: membershipData.role_id,
        status: membershipData.status,
        joined_at: membershipData.joined_at,
        roles: roleData,
      };

      setMembership(resolvedMembership);

      // 5. Fetch organisation
      const { data: organisationData, error: organisationError } =
        await supabase
          .from("organisations")
          .select("*")
          .eq("id", organisationId)
          .maybeSingle();

      if (organisationError) {
        console.error("Failed to load organisation:", organisationError);
      }

      if (!organisationData) {
        showToast("Organisation could not be found.", "error");
        router.push("/dashboard");
        return;
      }

      setOrganisation(organisationData as Organisation);

      // 6. Fetch active people count (from people table, not memberships)
      const { count: memberCount, error: memberCountError } = await supabase
        .from("people")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("organisation_id", organisationId)
        .eq("status", "active");

      if (memberCountError) {
        console.error("Failed to load member count:", memberCountError);
      }

      // 7. Fetch active group count
      const { count: groupCount, error: groupCountError } = await supabase
        .from("groups")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("organisation_id", organisationId)
        .is("archived_at", null);

      if (groupCountError) {
        console.error("Failed to load group count:", groupCountError);
      }

      // 8. Fetch next attendance session
      const { data: nextEventData, error: nextEventError } = await supabase
        .from("attendance_sessions")
        .select(
          `
            id,
            organisation_id,
            group_id,
            session_date,
            status
          `,
        )
        .eq("organisation_id", organisationId)
        .eq("status", "open")
        .gte("session_date", new Date().toISOString().split("T")[0])
        .order("session_date", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (nextEventError) {
        console.error(
          "Failed to load next attendance session:",
          nextEventError,
        );
      }

      const nextEvent: DashboardNextEvent | null = nextEventData
        ? {
            id: nextEventData.id,
            organisation_id: nextEventData.organisation_id,
            group_id: nextEventData.group_id ?? null,
            title: "Attendance Session",
            date: nextEventData.session_date,
            type: null,
          }
        : null;

      // 9. Calculate recent attendance rate from attendance_sessions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentSessions, error: recentSessionsError } =
        await supabase
          .from("attendance_sessions")
          .select("id, session_date")
          .eq("organisation_id", organisationId)
          .gte("session_date", sevenDaysAgo.toISOString().split("T")[0]);

      if (recentSessionsError) {
        console.error(
          "Failed to load recent attendance sessions:",
          recentSessionsError,
        );
      }

      let attendanceRate = 0;

      if (recentSessions && recentSessions.length > 0) {
        const sessionIds = recentSessions.map((s) => s.id);

        const { data: recentRecords } = await supabase
          .from("attendance_records")
          .select("status")
          .in("session_id", sessionIds);

        if (recentRecords && recentRecords.length > 0) {
          const totalRecords = recentRecords.length;
          const presentRecords = recentRecords.filter(
            (r) => r.status === "present" || r.status === "late",
          ).length;

          attendanceRate = Math.round((presentRecords / totalRecords) * 100);
        }
      }

      setStats({
        memberCount: memberCount || 0,
        groupCount: groupCount || 0,
        attendanceRate,
        nextEvent,
      });

      // 10. Fetch recent membership activity
      const { data: activityData, error: activityError } = await supabase
        .from("organisation_memberships")
        .select(
          `
            joined_at,
            user_id
          `,
        )
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .order("joined_at", {
          ascending: false,
        })
        .limit(5);

      if (activityError) {
        console.error("Failed to load recent activity:", {
          message: activityError.message,
          details: activityError.details,
          hint: activityError.hint,
          code: activityError.code,
          fullError: activityError,
        });
      }

      // Fetch profiles separately for activity
      let profileMap = new Map<string, { full_name: string | null }>();
      if (activityData && activityData.length > 0) {
        const userIds = [...new Set(activityData.map((a) => a.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profileData) {
          profileMap = new Map(
            profileData.map((p) => [p.id, { full_name: p.full_name }]),
          );
        }
      }

      const activities: RecentActivity[] = (activityData || [])
        .filter((item) => item.joined_at)
        .map((membershipItem) => {
          const profile = profileMap.get(membershipItem.user_id);

          return {
            type: "new_member",
            text: `${profile?.full_name || "A member"} joined the organisation`,
            date: new Date(
              membershipItem.joined_at as string,
            ).toLocaleDateString(),
          };
        });

      setRecentActivity(activities);

      // 11. Fetch pending ownership transfer
      if (transferId) {
        const { data: transferData, error: transferError } = await supabase
          .from("ownership_transfers")
          .select(
            `
              *,
              sender:sender_id (
                id,
                profiles (
                  full_name,
                  email
                )
              )
            `,
          )
          .eq("id", transferId)
          .eq("status", "pending")
          .maybeSingle();

        if (transferError) {
          console.error("Failed to load ownership transfer:", transferError);
        }

        if (transferData) {
          if (transferData.receiver_id === user.id) {
            setPendingTransfer(transferData as OwnershipTransfer);
            setShowTransferModal(true);
          } else {
            showToast(
              "You are not the designated receiver for this ownership transfer.",
              "error",
            );
          }
        }
      }
    } catch (error) {
      console.error("=== MEMBO DASHBOARD FATAL ERROR ===", error);

      showToast("Failed to load organisation dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }, [organisationId, transferId, router, showToast, supabase]);

  // ---------------------------------------------------------------------------
  // Initial dashboard load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDashboardData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchDashboardData]);

  // ---------------------------------------------------------------------------
  // Ownership transfer handlers
  // ---------------------------------------------------------------------------

  async function handleAcceptTransfer() {
    if (!pendingTransfer) {
      return;
    }

    setTransferProcessing(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "accept_ownership_transfer",
        {
          p_transfer_id: pendingTransfer.id,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      showToast(
        "Ownership successfully transferred. You are now the Owner.",
        "success",
      );

      setShowTransferModal(false);
      setPendingTransfer(null);

      router.push(`/dashboard/organizations/${organisationId}`);

      void fetchDashboardData();
    } catch (error) {
      console.error("Failed to accept ownership transfer:", error);

      showToast(
        error instanceof Error
          ? error.message
          : "Failed to accept ownership transfer.",
        "error",
      );
    } finally {
      setTransferProcessing(false);
    }
  }

  async function handleDeclineTransfer() {
    if (!pendingTransfer) {
      return;
    }

    setTransferProcessing(true);

    try {
      const { error: updateError } = await supabase
        .from("ownership_transfers")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pendingTransfer.id)
        .eq("status", "pending");

      if (updateError) {
        throw updateError;
      }

      showToast("Ownership transfer request declined.", "info");

      setShowTransferModal(false);
      setPendingTransfer(null);

      router.push(`/dashboard/organizations/${organisationId}`);
    } catch (error) {
      console.error("Failed to reject ownership transfer:", error);

      showToast("Failed to decline ownership transfer.", "error");
    } finally {
      setTransferProcessing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Profile handler
  // ---------------------------------------------------------------------------

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileName.trim() || !userProfile?.id) {
      return;
    }

    setSavingProfile(true);

    try {
      const updatedName = profileName.trim();

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: updatedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (error) {
        throw error;
      }

      setUserProfile((previous) =>
        previous
          ? {
              ...previous,
              full_name: updatedName,
            }
          : previous,
      );

      setProfileName(updatedName);

      showToast("Profile updated successfully.", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);

      showToast("Failed to save profile changes.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Resolve role and organisation configuration
  // ---------------------------------------------------------------------------

  const userRole = membership?.roles?.code || "member";
  const orgStatus = organisation?.status || "active";
  const terminology = organisation?.terminology || {};

  const labels = {
    owner: terminology.owner || "Owner",
    admin: terminology.admin || "Admin",
    member: terminology.member || "Member",
  };

  const userRoleLabel =
    userRole === "owner"
      ? labels.owner
      : userRole === "admin"
        ? labels.admin
        : labels.member;

  const isManager = userRole === "owner" || userRole === "admin";

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: "📊",
    },

    ...(isManager
      ? [
          {
            id: "people",
            label: "People Directory",
            icon: "👥",
          },
          {
            id: "groups",
            label: "Groups",
            icon: "📂",
          },
          {
            id: "attendance",
            label: "Attendance",
            icon: "📅",
          },
          {
            id: "members",
            label: "Members & Roles",
            icon: "🔑",
          },
          {
            id: "settings",
            label: "Settings & Profile",
            icon: "⚙️",
          },
        ]
      : [
          {
            id: "groups",
            label: "My Groups",
            icon: "📂",
          },
          {
            id: "profile",
            label: "My Profile",
            icon: "👤",
          },
        ]),

    {
      id: "notifications",
      label: "Notifications",
      icon: "🔔",
    },
  ];

  const isKnownTab = tabs.some((tab) => tab.id === activeTab);

  const resolvedActiveTab = isKnownTab ? activeTab : "overview";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      {/* ------------------------------------------------------------------- */}
      {/* Compact Header (appears on scroll) */}
      {/* ------------------------------------------------------------------- */}

      {showCompactHeader && (
        <div className="sticky top-0 z-30 h-20 pointer-events-none">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-center px-4 md:px-6 md:justify-start">
            <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
              <Link
                href="/dashboard"
                className="hidden md:flex text-(--muted) hover:text-(--foreground) transition-colors shrink-0 items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
              </Link>

              <h1 className="text-base md:text-lg font-semibold text-(--foreground) truncate max-w-[200px] md:max-w-md">
                {organisation?.name || "Organisation"}
              </h1>

              <div
                className={[
                  "hidden md:block h-2.5 w-2.5 rounded-full shrink-0",
                  orgStatus === "locked" ? "bg-red-500" : "bg-emerald-500",
                ].join(" ")}
                title={orgStatus}
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Organisation Header */}
      {/* ------------------------------------------------------------------- */}

      <div className="border-b border-(--border) bg-(--surface) p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-linear-to-br from-(--primary) to-(--primary-dark) text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              {organisation?.name
                ? organisation.name
                    .split(" ")
                    .filter(Boolean)
                    .map((word) => word[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "MEM"}
            </div>

            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-(--foreground) truncate">
                {organisation?.name || "Organisation"}
              </h1>

              {organisation?.slug && (
                <p className="text-xs text-(--muted) font-mono truncate">
                  slug: {organisation.slug}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="text-sm text-(--muted) hover:text-(--foreground) transition-colors"
            >
              ← Back to Dashboard
            </Link>

            <div
              className={[
                "h-2.5 w-2.5 rounded-full",
                orgStatus === "locked" ? "bg-red-500" : "bg-emerald-500",
              ].join(" ")}
              title={orgStatus}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Tab Navigation (Sticky) */}
      {/* ------------------------------------------------------------------- */}

      <div
        className={[
          "border-b border-(--border) bg-(--surface)",
          showCompactHeader ? "sticky top-20 z-30" : "sticky top-0 z-30",
        ].join(" ")}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => {
              const isActive = resolvedActiveTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "groups") {
                      router.push(
                        `/dashboard/organizations/${organisationId}/groups`,
                      );
                      return;
                    }

                    setActiveTab(tab.id);
                  }}
                  className={[
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    isActive
                      ? "bg-(--primary)/10 text-(--primary)"
                      : "text-(--muted) hover:text-(--foreground) hover:bg-(--background)",
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

      {/* ------------------------------------------------------------------- */}
      {/* Main Content */}
      {/* ------------------------------------------------------------------- */}

      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <DashboardSkeleton isManager={isManager} />
        ) : (
          <>
            {/* ================================================================ */}
            {/* OVERVIEW */}
            {/* ================================================================ */}

            {resolvedActiveTab === "overview" && (
              <div className="space-y-6">
                {/* Duplicate Alerts */}

                {isManager && (
                  <DuplicateAlerts organisationId={organisationId} />
                )}

                {/* Welcome Banner */}

                <div className="relative overflow-hidden bg-linear-to-r from-(--primary) to-(--secondary) rounded-xl p-6 md:p-8 text-white shadow-lg">
                  <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-2 max-w-xl">
                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      Welcome to {organisation?.name || "your workspace"!}
                    </h3>

                    <p className="text-sm text-white/90 leading-relaxed">
                      This is your workspace where you can manage teams,
                      organise events, record attendance, and keep records
                      synced in real time.
                    </p>
                  </div>
                </div>

                {/* Stats */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-(--surface) p-5 rounded-xl border border-(--border) shadow-sm space-y-1">
                    <span className="text-xs text-(--muted) font-semibold uppercase tracking-wider">
                      Role
                    </span>

                    <p className="text-2xl font-bold text-(--foreground)">
                      {userRoleLabel}
                    </p>
                  </div>

                  <div className="bg-(--surface) p-5 rounded-xl border border-(--border) shadow-sm space-y-1">
                    <span className="text-xs text-(--muted) font-semibold uppercase tracking-wider">
                      Members
                    </span>

                    <p className="text-2xl font-bold text-(--foreground)">
                      {stats.memberCount}
                    </p>
                  </div>

                  <div className="bg-(--surface) p-5 rounded-xl border border-(--border) shadow-sm space-y-1">
                    <span className="text-xs text-(--muted) font-semibold uppercase tracking-wider">
                      Groups
                    </span>

                    <p className="text-2xl font-bold text-(--foreground)">
                      {stats.groupCount}
                    </p>
                  </div>

                  <div className="bg-(--surface) p-5 rounded-xl border border-(--border) shadow-sm space-y-1">
                    <span className="text-xs text-(--muted) font-semibold uppercase tracking-wider">
                      Attendance Rate
                    </span>

                    <p className="text-2xl font-bold text-(--foreground)">
                      {stats.attendanceRate}%
                    </p>
                  </div>
                </div>

                {/* Next Event */}

                {stats.nextEvent && (
                  <div className="bg-linear-to-r from-(--primary) to-(--primary-light) rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                          Next Event
                        </p>

                        <h3 className="text-xl font-bold mt-1 truncate">
                          {stats.nextEvent.title}
                        </h3>

                        <p className="text-sm opacity-90 mt-1">
                          {new Date(stats.nextEvent.date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>

                        {stats.nextEvent.type && (
                          <p className="text-xs opacity-75 mt-1 capitalize">
                            {stats.nextEvent.type}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">Upcoming</p>

                        <p className="text-xs opacity-80">Attendance session</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity + Quick Links */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Recent Activity */}

                  <div className="md:col-span-2 bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
                    <h4 className="text-base font-bold text-(--foreground) border-b border-(--border) pb-2">
                      Recent Activity
                    </h4>

                    <div className="space-y-4">
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity, index) => (
                          <div
                            key={`${activity.type}-${activity.date}-${index}`}
                            className="flex gap-3 text-sm"
                          >
                            <span className="text-lg">👥</span>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-(--foreground)">
                                {activity.text}
                              </p>

                              <p className="text-xs text-(--muted)">
                                New member joined
                              </p>
                            </div>

                            <span className="text-xs text-(--muted) shrink-0 font-medium">
                              {activity.date}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-(--muted)">
                          No recent activity.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Links */}

                  <div className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-(--foreground) border-b border-(--border) pb-2">
                        Quick Links
                      </h4>

                      <p className="text-xs text-(--muted) mt-2">
                        Navigate directly to common workspace tasks.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {isManager ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveTab("people")}
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            👥 Add / Invite members
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/organizations/${organisationId}/groups`,
                              )
                            }
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            📂 Manage workspace groups
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTab("attendance")}
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            📅 Manage attendance
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTab("settings")}
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            ⚙️ Organisation settings
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/organizations/${organisationId}/groups`,
                              )
                            }
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            📂 View my groups
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTab("profile")}
                            className="w-full text-left py-2 px-3 hover:bg-(--background) rounded-lg text-xs font-semibold text-(--primary) transition-all cursor-pointer"
                          >
                            👤 Manage my profile
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* PEOPLE */}
            {/* ================================================================ */}

            {resolvedActiveTab === "people" && isManager && (
              <PeopleTab organisationId={organisationId} userRole={userRole} />
            )}

            {/* ================================================================ */}
            {/* ATTENDANCE */}
            {/* ================================================================ */}

            {resolvedActiveTab === "attendance" && isManager && (
              <AttendanceTab
                organisationId={organisationId}
                userRole={userRole}
              />
            )}

            {/* ================================================================ */}
            {/* MEMBERS & ROLES */}
            {/* ================================================================ */}

            {resolvedActiveTab === "members" && isManager && (
              <MembersTab
                organisationId={organisationId}
                userRole={userRole}
                organisationStatus={orgStatus}
              />
            )}

            {/* ================================================================ */}
            {/* SETTINGS */}
            {/* ================================================================ */}

            {resolvedActiveTab === "settings" && isManager && (
              <SettingsTab
                organisationId={organisationId}
                userRole={userRole}
                organisationData={organisation}
                onUpdate={fetchDashboardData}
              />
            )}

            {/* ================================================================ */}
            {/* NOTIFICATIONS */}
            {/* ================================================================ */}

            {resolvedActiveTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-(--foreground)">
                    Workspace Notifications
                  </h3>

                  <p className="text-xs text-(--muted) mt-1">
                    Keep track of alerts, requests, and organisation activity.
                  </p>
                </div>

                <div className="bg-(--surface) border border-(--border) rounded-xl p-8 shadow-sm text-center">
                  <div className="h-12 w-12 rounded-full bg-(--primary)/10 text-(--primary) flex items-center justify-center mx-auto text-xl">
                    🔔
                  </div>

                  <h4 className="mt-4 text-sm font-bold text-(--foreground)">
                    No notifications yet
                  </h4>

                  <p className="mt-1 text-xs text-(--muted) max-w-md mx-auto">
                    Organisation notifications will appear here when there are
                    new requests, updates, or other activities requiring your
                    attention.
                  </p>
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* MEMBER PROFILE */}
            {/* ================================================================ */}

            {resolvedActiveTab === "profile" && userRole === "member" && (
              <div className="space-y-6 max-w-xl bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-(--foreground) border-b border-(--border) pb-2">
                    Profile Information
                  </h3>

                  <p className="text-xs text-(--muted) mt-2">
                    Update the personal information associated with your MEMBO
                    profile.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label
                      htmlFor="user-name"
                      className="block text-sm font-semibold text-(--foreground)"
                    >
                      Full Name
                    </label>

                    <input
                      id="user-name"
                      type="text"
                      required
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2 text-sm text-(--foreground) outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="user-email"
                      className="block text-sm font-semibold text-(--foreground)"
                    >
                      Email Address
                    </label>

                    <input
                      id="user-email"
                      type="email"
                      disabled
                      value={userProfile?.email || userEmail}
                      className="mt-1 w-full rounded-lg border border-(--border) bg-(--border)/30 px-4 py-2 text-sm text-(--muted) outline-none cursor-not-allowed font-medium"
                    />

                    <p className="text-[10px] text-(--muted) mt-1">
                      Your login email is managed through your MEMBO account.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile || !profileName.trim()}
                      className="px-6 py-2 bg-linear-to-r from-(--primary) to-(--primary-dark) text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingProfile ? "Saving..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* Ownership Transfer Modal */}
      {/* ------------------------------------------------------------------- */}

      {showTransferModal && pendingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-(--surface) max-w-md w-full rounded-xl border border-(--border) shadow-2xl p-6 relative overflow-hidden space-y-6">
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center space-y-3 relative z-10">
              <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto text-amber-500 text-2xl font-bold">
                👑
              </div>

              <h4 className="text-lg font-bold text-(--foreground)">
                Transfer Organisation Ownership
              </h4>

              <p className="text-xs text-(--muted) leading-relaxed">
                You have been invited by{" "}
                <span className="font-semibold text-(--foreground)">
                  {pendingTransfer.sender?.profiles?.full_name ||
                    pendingTransfer.sender?.profiles?.email ||
                    "the current owner"}
                </span>{" "}
                to assume ownership of this organisation workspace (
                <span className="font-semibold text-(--foreground)">
                  {organisation?.name}
                </span>
                ).
              </p>
            </div>

            <div className="bg-(--background) p-4 rounded-lg border border-(--border) text-xs text-(--muted) leading-relaxed space-y-1.5">
              <p className="font-semibold text-(--foreground)">
                What happens next?
              </p>

              <p>
                • You will be promoted to the{" "}
                <strong className="text-(--foreground)">Owner</strong> role.
              </p>

              <p>
                • You will gain full billing, settings, and administrative
                access.
              </p>

              <p>
                • The current owner will lose ownership privileges according to
                the transfer rules configured by MEMBO.
              </p>
            </div>

            <div className="pt-2 space-y-2 relative z-10">
              <button
                type="button"
                onClick={handleAcceptTransfer}
                disabled={transferProcessing}
                className="w-full py-2.5 bg-linear-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferProcessing
                  ? "Accepting..."
                  : "Accept Ownership & Transfer"}
              </button>

              <button
                type="button"
                onClick={handleDeclineTransfer}
                disabled={transferProcessing}
                className="w-full py-2.5 border border-(--border) text-(--foreground) text-xs font-semibold rounded-lg hover:bg-(--background) transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline & Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
