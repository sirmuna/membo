import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembersTab } from "@/components/organisation/members-tab";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ManageMembersPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // Fetch user's membership and role
  const { data: membership } = await supabase
    .from("organisation_memberships")
    .select(
      `
      *,
      roles (
        code,
        label
      )
    `,
    )
    .eq("organisation_id", id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/organizations");
  }

  const role = Array.isArray(membership.roles)
    ? membership.roles[0]
    : membership.roles;

  const userRole = role?.code || "member";

  // Fetch organization status
  const { data: organisation } = await supabase
    .from("organisations")
    .select("status")
    .eq("id", id)
    .single();

  const organisationStatus = organisation?.status || "active";

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <MembersTab
          organisationId={id}
          userRole={userRole}
          organisationStatus={organisationStatus}
        />
      </div>
    </div>
  );
}
