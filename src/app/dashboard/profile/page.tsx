import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted hover:text-foreground transition-colors"
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
            Back to Dashboard
          </a>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-foreground">
            Profile
          </h1>

          <p className="mt-2 text-muted">Manage your personal information.</p>
        </div>

        <ProfileForm
          userId={userId}
          profile={{
            full_name: profile?.full_name ?? "",
            email: profile?.email ?? "",
            phone: profile?.phone ?? "",
            avatar_url: profile?.avatar_url ?? "",
          }}
        />
      </div>
    </main>
  );
}
