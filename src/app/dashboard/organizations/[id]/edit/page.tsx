import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditOrganizationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-(--background) p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-(--foreground) mb-4">
          Edit Organization
        </h1>
        <p className="text-(--muted) mb-8">Organization ID: {id}</p>
        <div className="rounded-lg border border-(--border) bg-(--surface) p-6">
          <p className="text-(--muted)">
            Edit organization form coming soon...
          </p>
        </div>
      </div>
    </main>
  );
}
