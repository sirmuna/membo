import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // Fetch user's memberships with organization details
  const { data: memberships } = await supabase
    .from("organisation_memberships")
    .select(
      `
        *,
        organisations (*),
        roles (
          code,
          label
        )
      `,
    )
    .eq("user_id", userId)
    .eq("status", "active");

  // Fetch stats for each organization
  const orgIds = (memberships || []).map((m: { organisations: any }) =>
    Array.isArray(m.organisations) ? m.organisations[0].id : m.organisations.id,
  );

  const memberCounts = await Promise.all(
    orgIds.map(async (orgId: string) => {
      const { count } = await supabase
        .from("organisation_memberships")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .eq("status", "active");
      return { orgId, count: count || 0 };
    }),
  );

  const memberCountMap = Object.fromEntries(
    memberCounts.map((m: { orgId: string; count: number }) => [
      m.orgId,
      m.count,
    ]),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-(--foreground)">
            Organizations
          </h1>

          <p className="mt-2 text-(--muted)">
            Manage your organizations and memberships
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex gap-3">
          <Link
            href="/dashboard/organizations/new"
            className="inline-flex items-center rounded-lg bg-linear-to-r from-(--primary) to-(--primary-dark) px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-(--primary)/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
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
            Create Organization
          </Link>
        </div>

        {/* Organizations Grid */}
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
                  className="group relative overflow-hidden rounded-lg border border-(--border) bg-(--surface) p-6 transition-all duration-300 hover:border-(--primary) hover:shadow-lg"
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-linear-to-br from-(--primary)/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-(--primary)/20 to-(--primary)/10 transition-colors group-hover:from-(--primary)/30 group-hover:to-(--primary)/20">
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
                        className="h-5 w-5 text-(--muted) transition-all duration-300 group-hover:translate-x-1 group-hover:text-(--primary)"
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

                    <h3 className="truncate text-lg font-bold text-(--foreground) transition-colors group-hover:text-(--primary)">
                      {organisation.name}
                    </h3>

                    <p className="mt-1 truncate text-sm text-(--muted)">
                      {organisation.org_type || "Organisation"}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-(--border) pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-(--muted)"
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
                          <span className="text-xs font-semibold text-(--foreground)">
                            {memberCountMap[organisation.id] || 0}
                          </span>
                        </div>
                        <span className="text-xs text-(--muted)">members</span>
                      </div>

                      <span className="shrink-0 rounded-full bg-(--primary)/10 px-3 py-1 text-xs font-semibold text-(--primary)">
                        {role?.label || "Member"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-(--border) bg-linear-to-br from-(--surface) to-(--background) p-12 text-center sm:p-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-(--primary)/20 to-(--primary)/10">
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

            <h3 className="text-xl font-bold text-(--foreground) sm:text-2xl">
              No organizations yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-(--muted)">
              Create your first organization or join an existing one to start
              collaborating with your team.
            </p>

            <Link
              href="/dashboard/organizations/new"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-linear-to-r from-(--primary) to-(--primary-dark) px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-(--primary)/30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-4 w-4"
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
              Create Organization
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
