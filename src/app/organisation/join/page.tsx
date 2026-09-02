"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function JoinOrganisationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [searching, setSearching] = useState(false);
  const [organisation, setOrganisation] = useState<any>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;

    setSearching(true);
    setSearchAttempted(true);
    setError("");
    setOrganisation(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("organisations")
        .select("id, name, slug, org_type")
        .eq("slug", slug.trim().toLowerCase())
        .maybeSingle();

      if (fetchError) throw fetchError;
      setOrganisation(data);
    } catch (err: any) {
      console.error("Failed to lookup organisation:", err);
      setError("Failed to lookup organisation. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest() {
    if (!organisation) return;

    setRequestSending(true);
    setError("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error(
          "You must be logged in to request to join an organisation.",
        );
      }

      // Insert join request
      const { data: insertedRequest, error: insertError } = await supabase
        .from("organisation_join_requests")
        .insert({
          organisation_id: organisation.id,
          user_id: userData.user.id,
          status: "pending",
        })
        .select()
        .single();

      console.log("=== MEMBO JOIN REQUEST ===");
      console.log("Authenticated user:", userData.user.id);
      console.log("Organisation:", organisation.id);
      console.log("Inserted request:", insertedRequest);
      console.log("Insert error:", insertError);

      if (insertError) {
        // If unique constraint violated (already have a pending request)
        if (insertError.code === "23505") {
          throw new Error(
            "You already have a pending join request for this organisation.",
          );
        }
        throw insertError;
      }

      setRequestSent(true);
      if (window.addToast) {
        window.addToast("Join request sent successfully", "success");
      }
    } catch (err: any) {
      console.error("Failed to send join request:", err);
      setError(
        err.message ||
          "Failed to submit request. You might already have a pending request.",
      );
    } finally {
      setRequestSending(false);
    }
  }

  if (requestSent) {
    return (
      <main className="min-h-screen bg-(--background) py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Request Sent!
            </h1>

            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Your request to join{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {organisation.name}
              </span>{" "}
              has been sent successfully. An administrator must approve your
              request before you can access the workspace.
            </p>

            <div className="pt-4 flex gap-4">
              <button
                onClick={() => {
                  setRequestSent(false);
                  setSearchAttempted(false);
                  setOrganisation(null);
                  setSlug("");
                }}
                className="w-1/2 py-2.5 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--border)]/20 transition-all cursor-pointer"
              >
                Join Another
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-1/2 py-2.5 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-(--background) py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              Join Organisation
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Enter the unique Organisation ID/slug to request access
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="org-slug"
                className="block text-sm font-semibold text-[var(--foreground)]"
              >
                Organisation Slug ID
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id="org-slug"
                  type="text"
                  required
                  placeholder="e.g. apostolic-church"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={searching || requestSending}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all font-mono text-sm"
                />
                <button
                  type="submit"
                  disabled={searching || !slug}
                  className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--primary-dark)] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  {searching ? "Searching..." : "Find"}
                </button>
              </div>
            </div>
          </form>

          {/* Search Result */}
          {searchAttempted && !searching && (
            <div className="mt-6 border-t border-[var(--border)] pt-6 space-y-4 animate-fade-in">
              {organisation ? (
                <div className="bg-(--background) p-5 rounded-lg border border-[var(--border)] space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">
                      {organisation.name}
                    </h3>
                    <p className="text-sm text-[var(--muted)]">
                      {organisation.org_type || "Organisation"}
                    </p>
                    <span className="mt-2 inline-block font-mono text-xs text-[var(--muted)]">
                      ID: {organisation.slug}
                    </span>
                  </div>

                  <button
                    onClick={handleSendRequest}
                    disabled={requestSending}
                    className="w-full py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center"
                  >
                    {requestSending
                      ? "Sending Request..."
                      : "Send Request to Join"}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-red-500 font-medium bg-red-500/5 rounded-lg border border-red-500/10">
                  No organisation found with slug ID "{slug}"
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[var(--primary)] hover:underline cursor-pointer"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
