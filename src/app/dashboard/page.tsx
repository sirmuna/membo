import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  try {
    const { data: claimsData, error: authError } =
      await supabase.auth.getClaims();

    if (authError) {
      console.error("Auth error:", authError);
      redirect("/auth/login");
    }

    if (!claimsData?.claims) {
      redirect("/auth/login");
    }

    const userId = claimsData.claims.sub;

    if (!userId) {
      redirect("/auth/login");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    const { data: memberships, error } = await supabase
      .from("organisation_memberships")
      .select(
        `
        id,
        organisation_id,
        status,
        joined_at,
        organisations (
          id,
          name,
          slug,
          org_type,
          status
        ),
        roles (
          code,
          label
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Failed to load organisations:", error);
    }

    return (
      <main className="min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-(--primary) to-(--primary-dark) flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-(--primary) uppercase tracking-wider">
                    Dashboard
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-(--foreground)">
                  Welcome
                  {profile?.full_name
                    ? `, ${profile.full_name.split(" ")[0]}`
                    : ""}
                </h1>
                <p className="mt-2 text-(--muted) text-base">
                  Manage and organize your workspace efficiently
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-(--border) bg-(--surface) p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-(--muted) uppercase tracking-wide">
                    Total Orgs
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-(--foreground)">
                    {memberships?.length || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-(--primary)/20 to-(--primary)/10 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-(--primary)"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-(--border) bg-(--surface) p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-(--muted) uppercase tracking-wide">
                    Active
                  </p>
                  <p className="mt-2 text-2xl sm:text-3xl font-bold text-(--foreground)">
                    {memberships?.filter((m) => m.status === "active").length ||
                      0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-(--success)/20 to-(--success)/10 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-(--success)"
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
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-(--border) bg-(--surface) p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-(--muted) uppercase tracking-wide">
                    Email
                  </p>
                  <p className="mt-2 text-xs sm:text-sm font-semibold text-(--foreground) truncate">
                    {profile?.email || "—"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-(--info)/20 to-(--info)/10 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-(--info)"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-(--border) bg-(--surface) p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-(--muted) uppercase tracking-wide">
                    Profile
                  </p>
                  <p className="mt-2 text-xs sm:text-sm font-semibold text-(--foreground) truncate">
                    {profile?.full_name || "—"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-(--accent)/20 to-(--accent)/10 flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-(--accent)"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Organisations Section */}
          <section>
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-(--foreground)">
                    Organisations
                  </h2>
                  <p className="mt-1 text-sm text-(--muted)">
                    {memberships?.length || 0} organisation
                    {memberships?.length !== 1 ? "s" : ""} · Manage your
                    workspace
                  </p>
                </div>

                <div className="flex gap-3">
                  <Link
                    href="/organisation/join"
                    className="inline-flex items-center justify-center rounded-lg border border-(--border) bg-(--surface) px-6 py-2.5 text-sm font-semibold text-(--foreground) hover:bg-(--primary)/10 hover:border-(--primary) transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Join
                  </Link>
                  <Link
                    href="/dashboard/organizations/new"
                    className="inline-flex items-center justify-center rounded-lg bg-linear-to-r from-(--primary) to-(--primary-dark) px-6 py-2.5 text-sm font-semibold text-white hover:shadow-lg hover:shadow-(--primary)/30 transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create New
                  </Link>
                </div>
              </div>
            </div>

            {memberships && memberships.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => {
                  const organisation = Array.isArray(membership.organisations)
                    ? membership.organisations[0]
                    : membership.organisations;

                  const role = Array.isArray(membership.roles)
                    ? membership.roles[0]
                    : membership.roles;

                  if (!organisation) {
                    return null;
                  }

                  return (
                    <Link
                      key={membership.id}
                      href={`/dashboard/organizations/${organisation.id}`}
                      className="group relative rounded-lg border border-(--border) bg-(--surface) p-6 hover:border-(--primary) hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-linear-to-br from-(--primary)/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-10 w-10 rounded-lg bg-linear-to-br from-(--primary)/20 to-(--primary)/10 flex items-center justify-center group-hover:from-(--primary)/30 group-hover:to-(--primary)/20 transition-colors">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-(--primary)"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-(--muted) group-hover:text-(--primary) group-hover:translate-x-1 transition-all duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>

                        <h3 className="text-lg font-bold text-(--foreground) group-hover:text-(--primary) transition-colors truncate">
                          {organisation.name}
                        </h3>

                        <p className="mt-1 text-sm text-(--muted) truncate">
                          {organisation.org_type || "Organisation"}
                        </p>

                        <div className="mt-5 pt-4 border-t border-(--border) flex items-center justify-between gap-2">
                          <span className="text-xs font-mono text-(--muted) truncate flex-1">
                            {organisation.slug}
                          </span>
                          <span className="rounded-full bg-(--primary)/10 text-(--primary) px-3 py-1 text-xs font-semibold shrink-0">
                            {role?.label || "Member"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-(--border) bg-linear-to-br from-(--surface) to-(--background) p-12 sm:p-16 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-(--primary)/10 flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-(--primary)"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-(--foreground)">
                  No organisations yet
                </h3>

                <p className="mt-2 text-(--muted) max-w-sm mx-auto">
                  Create your first organisation or join an existing one to
                  start collaborating with your team.
                </p>

                <Link
                  href="/dashboard/organizations/new"
                  className="mt-8 inline-flex items-center justify-center rounded-lg bg-linear-to-r from-(--primary) to-(--primary-dark) px-8 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-(--primary)/30 transition-all duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Organisation
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    redirect("/auth/login");
  }
}
