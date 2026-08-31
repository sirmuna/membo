"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Person = {
  id: string;
  organisation_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

/*
 * ---------------------------------------------------------
 * SKELETON
 * Mirrors the header + directory list layout so nothing shifts
 * when real data replaces it.
 * ---------------------------------------------------------
 */
function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`bg-(--border) rounded ${className}`} />;
}

function DirectorySkeleton() {
  return (
    <div className="min-h-screen bg-(--background) p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
        {/* Header */}
        <div>
          <SkeletonLine className="h-4 w-28" />

          <div className="mt-4 space-y-3">
            <SkeletonLine className="h-8 w-64" />
            <SkeletonLine className="h-4 w-full max-w-xl" />
            <SkeletonLine className="h-4 w-3/4 max-w-md" />
          </div>

          <SkeletonLine className="mt-3 h-3 w-40" />
        </div>

        {/* Directory */}
        <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
          <div className="border-b border-(--border) p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <SkeletonLine className="h-5 w-40" />
                <SkeletonLine className="h-3.5 w-24" />
              </div>
              <SkeletonLine className="h-8 w-20 rounded-lg" />
            </div>
          </div>

          <div className="divide-y divide-(--border)">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-5">
                <div className="h-11 w-11 shrink-0 rounded-full bg-(--border)" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-4 w-40" />
                  <SkeletonLine className="h-3 w-56" />
                </div>
                <SkeletonLine className="h-6 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneralMembersPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const orgId = params.id;

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [userRole, setUserRole] = useState("");
  const [canManage, setCanManage] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [adding, setAdding] = useState(false);

  const loadPeopleData = useCallback(async () => {
    const { data, error: peopleError } = await supabase
      .from("people")
      .select(
        `
          id,
          organisation_id,
          first_name,
          last_name,
          email,
          phone,
          status,
          created_at
        `,
      )
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false });

    if (peopleError) {
      console.error("Failed to load people:", {
        message: peopleError.message,
        details: peopleError.details,
        hint: peopleError.hint,
        code: peopleError.code,
      });

      setError(peopleError.message);
      return;
    }

    setPeople(data ?? []);
  }, [orgId, supabase]);

  const loadOrganisationContext = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      router.push("/auth/login");
      return false;
    }

    // NOTE: fetched in two plain queries rather than via a PostgREST
    // embedded relationship (`roles ( code )`). This matches the
    // defensive pattern used elsewhere in this codebase (see
    // members-tab.tsx) since embedded-relationship queries depend on
    // PostgREST's schema cache correctly recognising the
    // organisation_memberships.role_id -> roles.id foreign key, which
    // is not something to rely on here.
    const { data: membership, error: membershipError } = await supabase
      .from("organisation_memberships")
      .select("role_id")
      .eq("organisation_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Failed to load organisation membership:", {
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        code: membershipError.code,
      });

      throw membershipError;
    }

    if (!membership) {
      setUserRole("member");
      setCanManage(false);
      setError("You are not a member of this organisation.");
      return false;
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("code")
      .eq("id", membership.role_id)
      .maybeSingle();

    if (roleError) {
      console.error("Failed to load role:", {
        message: roleError.message,
        details: roleError.details,
        hint: roleError.hint,
        code: roleError.code,
      });

      throw roleError;
    }

    const roleCode = roleRow?.code?.toLowerCase() ?? "member";

    setUserRole(roleCode);

    const manageableRoles = ["manager", "owner", "admin"];

    setCanManage(manageableRoles.includes(roleCode));

    return true;
  }, [orgId, router, supabase]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        // Run both requests concurrently rather than waiting for the
        // membership/role lookup to finish before starting the people
        // fetch — RLS on public.people already enforces access control
        // server-side, so there's no correctness reason to serialize
        // these on the client.
        const [hasAccess] = await Promise.all([
          loadOrganisationContext(),
          loadPeopleData(),
        ]);

        if (!mounted || !hasAccess) {
          return;
        }
      } catch (err) {
        console.error("Failed to load organisation directory:", {
          error: err,
          message: err instanceof Error ? err.message : undefined,
        });

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load the organisation directory.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [loadOrganisationContext, loadPeopleData]);

  async function handleAddPerson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canManage) {
      setError("You do not have permission to add people.");
      return;
    }

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanFirstName) {
      setMessage("First name is required.");
      return;
    }

    setAdding(true);
    setMessage("");
    setError("");

    try {
      let duplicateQuery = supabase
        .from("people")
        .select("id, first_name, last_name")
        .eq("organisation_id", orgId)
        .ilike("first_name", cleanFirstName);

      if (cleanLastName) {
        duplicateQuery = duplicateQuery.ilike("last_name", cleanLastName);
      }

      const { data: existingPeople, error: duplicateError } =
        await duplicateQuery.limit(2);

      if (duplicateError) {
        throw duplicateError;
      }

      if (existingPeople && existingPeople.length > 0) {
        setMessage(
          "A person with this name already exists in the organisation directory.",
        );
        return;
      }

      const { error: insertError } = await supabase.from("people").insert({
        organisation_id: orgId,
        first_name: cleanFirstName,
        last_name: cleanLastName || null,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        status: "active",
        custom_fields: {},
      });

      if (insertError) {
        throw insertError;
      }

      setMessage("Person added successfully.");

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");

      await loadPeopleData();
    } catch (err) {
      console.error("Failed to add person:", {
        error: err,
        message: err instanceof Error ? err.message : undefined,
      });

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add person to the directory.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDeactivate(personId: string) {
    if (!canManage) {
      setError("You do not have permission to deactivate people.");
      return;
    }

    const confirmed = window.confirm(
      "Deactivate this person from the organisation directory?\n\n" +
        "Their existing records will be retained.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("people")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId)
      .eq("organisation_id", orgId);

    if (updateError) {
      console.error("Failed to deactivate person:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });

      setError(updateError.message);
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? {
              ...person,
              status: "inactive",
            }
          : person,
      ),
    );

    setMessage("Person deactivated successfully.");
  }

  async function handleReactivate(personId: string) {
    if (!canManage) {
      setError("You do not have permission to reactivate people.");
      return;
    }

    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("people")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId)
      .eq("organisation_id", orgId);

    if (updateError) {
      console.error("Failed to reactivate person:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });

      setError(updateError.message);
      return;
    }

    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? {
              ...person,
              status: "active",
            }
          : person,
      ),
    );

    setMessage("Person reactivated successfully.");
  }

  if (loading) {
    return <DirectorySkeleton />;
  }

  return (
    <div className="min-h-screen bg-(--background) p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/dashboard/organizations/${orgId}/members`}
            className="text-sm text-(--muted) transition-colors hover:text-(--foreground)"
          >
            ← Back to Members
          </Link>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-(--foreground)">
              Organisation Directory
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-(--muted)">
              The master list of people belonging to this organisation. People
              can exist without a MEMBO account and can later be assigned to one
              or more groups.
            </p>
          </div>

          {userRole && (
            <p className="mt-2 text-xs capitalize text-(--muted)">
              Your organisation role: {userRole}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-(--error)/20 bg-(--error)/5 p-4 text-sm text-(--error)"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {message && !error && (
          <div
            role="status"
            className="rounded-lg border border-(--success)/20 bg-(--success)/5 p-4 text-sm text-(--success)"
          >
            {message}
          </div>
        )}

        {/* Add Person */}
        {canManage && (
          <div className="rounded-xl border border-(--border) bg-(--surface) p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-(--foreground)">
                Add Person
              </h2>

              <p className="mt-1 text-sm text-(--muted)">
                Add someone to the organisation directory. They can later be
                assigned to one or more groups.
              </p>
            </div>

            <form
              onSubmit={handleAddPerson}
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {/* First Name */}
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-sm font-medium text-(--foreground)"
                >
                  First Name
                </label>

                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-sm text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  placeholder="John"
                />
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="last-name"
                  className="block text-sm font-medium text-(--foreground)"
                >
                  Last Name
                </label>

                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-sm text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  placeholder="Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-(--foreground)"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-sm text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  placeholder="john.doe@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-(--foreground)"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2.5 text-sm text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
                  placeholder="08012345678"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 md:col-span-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-lg bg-(--primary) px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-(--primary-dark) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Person"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Directory */}
        <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
          <div className="border-b border-(--border) p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-(--foreground)">
                  People Directory
                </h2>

                <p className="mt-1 text-sm text-(--muted)">
                  {people.length} {people.length === 1 ? "person" : "people"}{" "}
                  registered
                </p>
              </div>

              <div className="rounded-lg bg-(--background) px-3 py-2 text-xs text-(--muted)">
                Active:{" "}
                {
                  people.filter(
                    (person) => person.status.toLowerCase() === "active",
                  ).length
                }
              </div>
            </div>
          </div>

          {people.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-(--muted)">
                No people have been added to this organisation yet.
              </p>

              {canManage && (
                <p className="mt-1 text-xs text-(--muted)">
                  Use the form above to add the first person.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {people.map((person) => {
                const fullName = [person.first_name, person.last_name]
                  .filter(Boolean)
                  .join(" ");

                const isActive = person.status.toLowerCase() === "active";

                return (
                  <div
                    key={person.id}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-(--background)/50 md:flex-row md:items-center md:justify-between"
                  >
                    {/* Person */}
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--border) bg-(--primary)/10">
                        <span className="font-semibold text-(--primary)">
                          {person.first_name?.[0]?.toUpperCase() || "P"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-(--foreground)">
                          {fullName || "Unnamed person"}
                        </p>

                        <div className="mt-1 space-y-0.5">
                          {person.email && (
                            <p className="truncate text-xs text-(--muted)">
                              {person.email}
                            </p>
                          )}

                          {person.phone && (
                            <p className="text-xs text-(--muted)">
                              {person.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status / Actions */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={
                          isActive
                            ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600"
                            : "rounded-full bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-500"
                        }
                      >
                        {person.status}
                      </span>

                      {canManage && isActive && (
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(person.id)}
                          className="text-xs font-medium text-(--error) transition-opacity hover:opacity-80 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}

                      {canManage && !isActive && (
                        <button
                          type="button"
                          onClick={() => void handleReactivate(person.id)}
                          className="text-xs font-medium text-(--primary) transition-opacity hover:opacity-80 hover:underline"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}