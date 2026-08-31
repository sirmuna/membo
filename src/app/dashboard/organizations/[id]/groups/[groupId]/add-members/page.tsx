import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupsTab } from "@/components/organisation/groups-tab";
import { OrganisationNavbar } from "@/components/organisation/organisation-navbar";

type PageProps = {
  params: Promise<{
    id: string;
    groupId: string;
  }>;
};

export default async function AddMembersPage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    redirect("/dashboard/organizations");
  }

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      <OrganisationNavbar
        organisationId={id}
        userRole="admin"
        activeTab="groups"
      />
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">
        <GroupsTab organisationId={id} userRole="admin" />
      </main>
    </div>
  );
}