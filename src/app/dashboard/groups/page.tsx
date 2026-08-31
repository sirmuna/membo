"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function GroupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOrganizations() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("organisation_memberships")
        .select(
          `
          organisation_id,
          organisations (id, name, slug)
        `,
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      const normalizedOrgs = (data || []).map((item: any) => ({
        organisation_id: item.organisation_id,
        organisations: Array.isArray(item.organisations)
          ? item.organisations[0]
          : item.organisations,
      }));

      setOrganizations(normalizedOrgs);
      setLoading(false);
    }

    fetchOrganizations();
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

  if (organizations.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-(--border) bg-(--surface) p-8 text-center">
            <p className="mb-4 text-(--muted)">
              You need to join an organization to manage groups.
            </p>
            <Link
              href="/dashboard/organizations"
              className="inline-block rounded-lg bg-(--primary) px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--primary-dark)"
            >
              Go to Organizations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (organizations.length === 1) {
    // Redirect to the single organization's groups page
    router.push(
      `/dashboard/organizations/${organizations[0].organisation_id}/groups`,
    );
    return null;
  }

  // Show organization selection if multiple
  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-(--foreground)">Groups</h1>
          <p className="mt-2 text-(--muted)">
            Select an organization to manage its groups.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link
              key={org.organisation_id}
              href={`/dashboard/organizations/${org.organisation_id}/groups`}
              className="rounded-lg border border-(--border) bg-(--surface) p-6 transition-shadow hover:shadow-lg"
            >
              <h3 className="mb-2 text-lg font-semibold text-(--foreground)">
                {org.organisations.name}
              </h3>
              <p className="mb-4 text-sm text-(--muted)">
                {org.organisations.slug}
              </p>
              <div className="flex items-center text-sm font-medium text-(--primary)">
                Manage Groups
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
      </div>
    </div>
  );
}
