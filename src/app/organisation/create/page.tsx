"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateOrganisationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgType, setOrgType] = useState("");
  const [loading, setLoading] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  // Helper to generate URL-safe slug
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove non-word chars
      .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with single hyphen
      .replace(/^-+|-+$/g, ""); // Trim hyphens
  }

  // Auto-generate slug when name changes, unless user edited slug manually
  const [isSlugEdited, setIsSlugEdited] = useState(false);
  useEffect(() => {
    if (!isSlugEdited && name) {
      setSlug(generateSlug(name));
    } else if (!name) {
      setSlug("");
    }
  }, [name, isSlugEdited]);

  // Validate slug uniqueness
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSlugChecking(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("organisations")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (error) throw error;
        setSlugAvailable(data === null);
      } catch (err) {
        console.error("Error checking slug uniqueness:", err);
      } finally {
        setSlugChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [slug, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug) {
      setError("Please fill out all required fields.");
      return;
    }

    if (slugAvailable === false) {
      setError("Slug is already taken. Please choose another one.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: orgId, error: rpcError } = await supabase.rpc(
        "create_organisation",
        {
          p_name: name,
          p_slug: slug,
          p_org_type: orgType || null,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      if (orgId) {
        if (window.addToast) {
          window.addToast("Organisation created successfully!", "success");
        }
        router.push(`/dashboard/organizations/${orgId}`);
      } else {
        throw new Error("Did not receive a valid organisation ID.");
      }
    } catch (err: any) {
      console.error("Failed to create organisation:", err);
      setError(
        err.message || "Failed to create organisation. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-(--background) py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              Create Organisation
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Set up a new workspace for your organisation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="org-name"
                  className="block text-sm font-semibold text-[var(--foreground)]"
                >
                  Organisation Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  required
                  placeholder="e.g. Apostolic Church"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="org-slug"
                    className="block text-sm font-semibold text-[var(--foreground)]"
                  >
                    URL Slug (Organisation ID){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {slugChecking && (
                    <span className="text-xs text-[var(--muted)]">
                      Checking...
                    </span>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <span className="text-xs text-emerald-500 font-medium">
                      ✓ Available
                    </span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="text-xs text-red-500 font-medium">
                      ✗ Taken
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    id="org-slug"
                    type="text"
                    required
                    placeholder="apostolic-church"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugEdited(true);
                      setSlug(generateSlug(e.target.value));
                    }}
                    className="w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  This identifier is used by members to find and request to join
                  your organisation.
                </p>
              </div>

              {/* Org Type */}
              <div>
                <label
                  htmlFor="org-type"
                  className="block text-sm font-semibold text-[var(--foreground)]"
                >
                  Organisation Type
                </label>
                <input
                  id="org-type"
                  type="text"
                  placeholder="e.g. Church, School, Club, Business"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2.5 text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500 flex items-center">
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-1/2 py-3 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm font-semibold hover:bg-[var(--border)]/20 transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || slugChecking || slugAvailable === false}
                className="w-1/2 py-3 px-4 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:hover:shadow-none transition-all cursor-pointer flex items-center justify-center"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
