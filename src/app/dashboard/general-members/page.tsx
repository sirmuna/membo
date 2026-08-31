"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Organization = {
  organisation_id: string;
  organisations: {
    id: string;
    name: string;
    slug: string;
  };
};

type OrganizationQueryResult = {
  organisation_id: string;
  organisations:
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

export default function GeneralMembersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Fetch user's organizations
      const { data: orgData, error } = await supabase
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

      if (error) {
        console.error("Error fetching organizations:", error);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const normalizedOrganizations: Organization[] = (
        (orgData ?? []) as OrganizationQueryResult[]
      )
        .filter(
          (
            org,
          ): org is OrganizationQueryResult & {
            organisations: NonNullable<
              OrganizationQueryResult["organisations"]
            >;
          } => Array.isArray(org.organisations) && org.organisations.length > 0,
        )
        .map((org) => ({
          organisation_id: org.organisation_id,
          organisations: org.organisations[0],
        }));

      setOrganizations(normalizedOrganizations);
      setLoading(false);
    }

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-(--muted)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-(--foreground)">
            General Members
          </h1>

          <p className="mt-2 text-(--muted)">
            Manage general members lists across your organizations.
          </p>
        </div>

        {organizations.length === 0 ? (
          <div className="rounded-lg border border-(--border) bg-(--surface) p-8 text-center">
            <p className="mb-4 text-(--muted)">
              You need to join or create an organization to manage general
              members.
            </p>

            <Link
              href="/dashboard/organizations"
              className="inline-block rounded-lg bg-(--primary) px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--primary-dark)"
            >
              Go to Organizations
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link
                key={org.organisation_id}
                href={`/dashboard/organizations/${org.organisation_id}/members/general`}
                className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg"
              >
                <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
                  {org.organisations.name}
                </h3>

                <p className="mb-4 text-sm text-(--muted)">
                  {org.organisations.slug}
                </p>

                <div className="flex items-center text-sm font-medium text-(--primary)">
                  Manage General Members
                  <svg
                    className="ml-1 h-4 w-4"
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
