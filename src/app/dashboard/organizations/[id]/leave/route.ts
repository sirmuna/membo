import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/auth/login");
  }

  const userId = claimsData.claims.sub;

  // Delete the membership
  const { error } = await supabase
    .from("organisation_memberships")
    .delete()
    .eq("organisation_id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Error leaving organization:", error);
    redirect(`/dashboard/organizations/${id}?error=leave_failed`);
  }

  // Revalidate the dashboard page
  revalidatePath("/dashboard");

  redirect("/dashboard");
}
