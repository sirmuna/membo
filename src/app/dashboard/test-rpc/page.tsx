// TEMPORARY TEST PAGE - REMOVE AFTER TESTING

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TestRPCPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // This will be triggered when the form is submitted
  async function createTestOrganisation() {
    "use server";

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("create_organisation", {
      p_name: "RPC Test Organisation",
      p_slug: "rpc-test-organisation",
      p_org_type: "company",
    });

    console.log({ data, error });

    return { data, error };
  }

  const result = await createTestOrganisation();

  return (
    <main className="min-h-screen bg-(--background) p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4">
          RPC Test Page
        </h1>
        <p className="text-[var(--muted)] mb-8">
          Temporary test page for Supabase RPC function
        </p>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Test create_organisation RPC
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                Parameters:
              </p>
              <pre className="text-xs bg-(--background) p-3 rounded border border-[var(--border)]">
                {JSON.stringify(
                  {
                    p_name: "RPC Test Organisation",
                    p_slug: "rpc-test-organisation",
                    p_org_type: "company",
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                Result:
              </p>
              <pre className="text-xs bg-(--background) p-3 rounded border border-[var(--border)] overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
