import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupsTab } from "@/components/organisation/groups-tab";
import { OrganisationNavbar } from "@/components/organisation/organisation-navbar";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupsPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || id === "undefined") {
    redirect("/dashboard/organizations");
  }

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  /*
   * Determine the authenticated user's role
   * inside this organisation.
   */
  const { data: membership, error: membershipError } = await supabase
    .from("organisation_memberships")
    .select(
      `
        id,
        organisation_id,
        user_id,
        status,
        role_id,
        roles (
          id,
          code,
          label
        )
      `,
    )
    .eq("organisation_id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    console.error("Failed to load organisation membership:", membershipError);

    redirect("/dashboard/organizations");
  }

  if (!membership) {
    redirect("/dashboard/organizations");
  }

  const roleData = membership.roles;

  const role = Array.isArray(roleData)
    ? roleData[0]?.code
    : (roleData as { code?: string } | null)?.code;

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      <OrganisationNavbar
        organisationId={id}
        userRole={role || "member"}
        activeTab="groups"
      />
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        <GroupsTab organisationId={id} userRole={role || "member"} />
      </main>
    </div>
  );
}
