"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SettingsTabProps {
  organisationId: string;
  userRole: string; // 'owner' | 'admin' | 'member'
  organisationData: any;
  onUpdate: () => void;
}

const timezones = [
  "UTC",
  "GMT",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function SettingsTab({
  organisationId,
  userRole,
  organisationData,
  onUpdate,
}: SettingsTabProps) {
  const supabase = createClient();
  const router = useRouter();
  const isOwner = userRole === "owner";
  const isReadOnly = organisationData.status === "locked";

  // Form states
  const [name, setName] = useState(organisationData.name || "");
  const [slug, setSlug] = useState(organisationData.slug || "");
  const [timezone, setTimezone] = useState(organisationData.timezone || "UTC");

  // Terminology states
  const [ownerLabel, setOwnerLabel] = useState(
    organisationData.terminology?.owner || "Owner",
  );
  const [adminLabel, setAdminLabel] = useState(
    organisationData.terminology?.admin || "Admin",
  );
  const [memberLabel, setMemberLabel] = useState(
    organisationData.terminology?.member || "Member",
  );

  const [saving, setSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Helper to generate URL-safe slug
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Validate slug uniqueness on change (if changed from original)
  useEffect(() => {
    if (!slug || slug === organisationData.slug) {
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
  }, [slug, organisationData.slug, supabase]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;
    if (!name || !slug) {
      setError("Name and Slug are required.");
      return;
    }

    if (slug !== organisationData.slug && slugAvailable === false) {
      setError("Slug is already taken. Please choose another one.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const terminology = {
        owner: ownerLabel.trim(),
        admin: adminLabel.trim(),
        member: memberLabel.trim(),
      };

      const { error: updateError } = await supabase
        .from("organisations")
        .update({
          name: name.trim(),
          slug: slug.trim(),
          timezone,
          terminology,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organisationId);

      if (updateError) throw updateError;

      setSuccess("Settings updated successfully!");
      if (window.addToast) {
        window.addToast("Organisation settings saved!", "success");
      }
      onUpdate();
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrganisation() {
    if (!isOwner || isReadOnly) return;
    if (deleteConfirmText !== organisationData.slug) {
      setError("Please type the correct Organisation Slug to confirm.");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase.rpc("delete_organisation", {
        p_org_id: organisationId,
      });

      if (deleteError) {
        console.error("Delete organisation RPC error:", deleteError);
        throw deleteError;
      }

      if (window.addToast) {
        window.addToast("Organisation deleted successfully.", "success");
      }
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to delete organisation:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      setError(
        err.message ||
          "Failed to delete organisation. Make sure the delete_organisation RPC function is installed in your database.",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {isReadOnly && (
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>
            This organisation is <strong>locked</strong>. Settings are
            read-only.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500 flex items-center animate-fade-in">
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

      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 flex items-center animate-fade-in">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <form
        onSubmit={handleSaveSettings}
        className="space-y-6 bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm"
      >
        <h3 className="text-lg font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
          General Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label
              htmlFor="org-name"
              className="block text-sm font-semibold text-[var(--foreground)]"
            >
              Organisation Name
            </label>
            <input
              id="org-name"
              type="text"
              required
              disabled={isReadOnly || saving}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex justify-between items-center">
              <label
                htmlFor="org-slug"
                className="block text-sm font-semibold text-[var(--foreground)]"
              >
                URL Slug ID
              </label>
              {slugChecking && (
                <span className="text-[10px] text-[var(--muted)]">
                  Checking...
                </span>
              )}
              {!slugChecking && slugAvailable === true && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  ✓ Available
                </span>
              )}
              {!slugChecking && slugAvailable === false && (
                <span className="text-[10px] text-red-500 font-medium">
                  ✗ Taken
                </span>
              )}
            </div>
            <input
              id="org-slug"
              type="text"
              required
              disabled={isReadOnly || saving}
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all font-mono"
            />
            {slug !== organisationData.slug && (
              <p className="text-[10px] text-amber-500 mt-1">
                Warning: Changing the slug ID will break old invitation/join
                links.
              </p>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label
              htmlFor="org-timezone"
              className="block text-sm font-semibold text-[var(--foreground)]"
            >
              Timezone
            </label>
            <select
              id="org-timezone"
              disabled={isReadOnly || saving}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-all"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="text-lg font-bold text-[var(--foreground)] border-b border-[var(--border)] pt-4 pb-2">
          Custom Terminology
        </h3>
        <p className="text-xs text-[var(--muted)] -mt-2">
          Customize the display labels for roles inside this workspace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="term-owner"
              className="block text-sm font-semibold text-[var(--foreground)]"
            >
              Owner Label
            </label>
            <input
              id="term-owner"
              type="text"
              disabled={isReadOnly || saving}
              value={ownerLabel}
              onChange={(e) => setOwnerLabel(e.target.value)}
              placeholder="e.g. Principal"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="term-admin"
              className="block text-sm font-semibold text-[var(--foreground)]"
            >
              Admin Label
            </label>
            <input
              id="term-admin"
              type="text"
              disabled={isReadOnly || saving}
              value={adminLabel}
              onChange={(e) => setAdminLabel(e.target.value)}
              placeholder="e.g. Teacher"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="term-member"
              className="block text-sm font-semibold text-[var(--foreground)]"
            >
              Member Label
            </label>
            <input
              id="term-member"
              type="text"
              disabled={isReadOnly || saving}
              value={memberLabel}
              onChange={(e) => setMemberLabel(e.target.value)}
              placeholder="e.g. Student"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-(--background) px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex justify-end">
          <button
            type="submit"
            disabled={
              isReadOnly ||
              saving ||
              (slug !== organisationData.slug && slugAvailable === false)
            }
            className="px-6 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 disabled:hover:shadow-none transition-all cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {isOwner && (
        <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-red-500">Danger Zone</h3>
          <p className="text-xs text-[var(--muted)]">
            Deleting this organisation will permanently delete the workspace,
            all memberships, groups, attendance and records. This action is
            irreversible.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isReadOnly}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Delete Organisation
            </button>
          ) : (
            <div className="space-y-4 border-t border-red-500/10 pt-4 animate-fade-in">
              <div>
                <label
                  htmlFor="confirm-slug"
                  className="block text-xs font-semibold text-red-500"
                >
                  Type the slug ID{" "}
                  <span className="font-mono bg-[var(--border)]/30 px-1 py-0.5 rounded text-[var(--foreground)]">
                    {organisationData.slug}
                  </span>{" "}
                  to confirm deletion:
                </label>
                <input
                  id="confirm-slug"
                  type="text"
                  placeholder={organisationData.slug}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-1.5 max-w-sm w-full rounded-lg border border-red-500/30 bg-(--background) px-4 py-2 text-xs text-[var(--foreground)] focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--border)]/20 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrganisation}
                  disabled={
                    deleting || deleteConfirmText !== organisationData.slug
                  }
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
