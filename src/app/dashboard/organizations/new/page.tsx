import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The form component lives in the same directory, but the filename uses the
// American spelling of "organization".
import CreateOrganisationForm from "./create-organisation-form";

export default async function NewOrganisationPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-(--background) p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-(--primary) to-(--primary-dark) flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
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
            <span className="text-xs font-semibold text-(--primary) uppercase tracking-wider">
              New Organisation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-(--foreground)">
            Create Organisation
          </h1>
          <p className="mt-2 text-(--muted) text-base">
            Create an organisation and become its Owner.
          </p>
        </div>

        <div className="mt-8">
          <CreateOrganisationForm />
        </div>
      </div>
    </main>
  );
}
