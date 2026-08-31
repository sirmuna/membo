import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganisationDashboard } from "@/components/organisation/organisation-dashboard";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    transfer?: string;
    tab?: string;
  }>;
};

export default async function DashboardOrganizationPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { transfer, tab } = await searchParams;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  return (
    <OrganisationDashboard
      organisationId={id}
      transferId={transfer}
      initialTab={tab}
    />
  );
}
