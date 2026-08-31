import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgSettingsPage } from "@/components/organisation/org-settings-page";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrganizationSettingsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // Fetch the organisation
  const { data: organisation, error: orgError } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", id)
    .single();

  if (orgError || !organisation) {
    redirect("/dashboard/organizations");
  }

  // Fetch the user's membership
  const { data: membership, error: membershipError } = await supabase
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
    .eq("organisation_id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/dashboard/organizations");
  }

  // Fetch the role explicitly using role_id
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, code, label")
    .eq("id", membership.role_id)
    .maybeSingle();

  const userRole = role?.code || "member";

  console.log("SETTINGS DEBUG:", {
    organisationId: id,
    userId,
    membership,
    membershipError,
    role,
    roleError,
    userRole,
  });

  console.log("SETTINGS DEBUG:", {
    organisationId: id,
    userId,
    membership,
    userRole,
  });

  console.log("SETTINGS DEBUG:", {
    organisationId: id,
    userId,
    membership,
    role,
    userRole,
  });

  // Only owners and admins can access settings
  if (userRole !== "owner" && userRole !== "admin") {
    redirect(`/dashboard/organizations/${id}`);
  }

  return (
    <main className="min-h-screen bg-(--background) p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href={`/dashboard/organizations/${id}`}
            className="inline-flex items-center text-sm text-(--muted) hover:text-(--foreground) transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
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
            Back to {organisation.name}
          </a>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-(--foreground)">
            Organisation Settings
          </h1>

          <p className="mt-2 text-(--muted)">
            Manage your organisation&apos;s general settings, terminology, and
            workspace configuration.
          </p>
        </div>

        <OrgSettingsPage
          organisationId={id}
          organisationData={organisation}
          userRole={userRole}
        />
      </div>
    </main>
  );
}
