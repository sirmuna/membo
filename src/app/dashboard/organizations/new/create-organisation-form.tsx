"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateOrganisationForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgType, setOrgType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data, error } = await supabase.rpc("create_organisation", {
      p_name: name,
      p_slug: slug,
      p_org_type: orgType || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/organizations/${data}`);
  }

  return (
    <div className="rounded-lg border border-(--border) bg-(--surface) p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-(--foreground) mb-2"
          >
            Organisation name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Example Community"
            className="w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-(--foreground) placeholder-(--muted) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-semibold text-(--foreground) mb-2"
          >
            Organisation ID
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value.toLowerCase().trim().replace(/\s+/g, "-"),
              )
            }
            required
            placeholder="example-community"
            className="w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-(--foreground) placeholder-(--muted) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
          <p className="mt-2 text-sm text-(--muted)">
            This becomes the organisation&apos;s unique identifier. Use
            lowercase letters, numbers, and hyphens.
          </p>
        </div>

        <div>
          <label
            htmlFor="orgType"
            className="block text-sm font-semibold text-(--foreground) mb-2"
          >
            Organisation type
          </label>
          <input
            id="orgType"
            type="text"
            value={orgType}
            onChange={(event) => setOrgType(event.target.value)}
            placeholder="Church, school, company, association..."
            className="w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-(--foreground) placeholder-(--muted) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-(--error)/20 bg-(--error)/5 p-4 text-sm text-(--error)">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mt-0.5 shrink-0"
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
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-linear-to-r from-(--primary) to-(--primary-dark) px-6 py-3 text-sm font-semibold text-white hover:shadow-lg hover:shadow-(--primary)/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </span>
            ) : (
              "Create Organisation"
            )}
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-(--border) bg-(--surface) px-6 py-3 text-sm font-semibold text-(--foreground) hover:bg-(--primary)/5 hover:border-(--primary) transition-all duration-200"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
