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
  user_id?: string | null;
  source?: "people" | "membership";
};

type MembershipRole = {
  code?: string | null;
};

type OrganisationMembership = {
  roles: MembershipRole | MembershipRole[] | null;
};

export default function GeneralMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setOrgId(p.id);
    });
  }, [params]);

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
    if (!orgId) return;

    // Load people from people table
    const { data: peopleData, error: peopleError } = await supabase
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
          created_at,
          user_id
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

    // Load members from organisation_memberships that don't have people records
    const { data: membershipsData, error: membershipsError } = await supabase
      .from("organisation_memberships")
      .select(
        `
          user_id,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `,
      )
      .eq("organisation_id", orgId)
      .eq("status", "active");

    if (membershipsError) {
      console.error("Failed to load memberships:", membershipsError);
    }

    // Get user_ids that already have people records
    const existingUserIds = new Set(
      (peopleData ?? [])
        .map((p) => p.user_id)
        .filter((id): id is string => id !== null),
    );

    // Create person records from memberships that don't exist in people table
    const membershipPeople: Person[] = [];
    if (membershipsData && !membershipsError) {
      for (const membership of membershipsData) {
        const profile = Array.isArray(membership.profiles)
          ? membership.profiles[0]
          : membership.profiles;

        if (profile && !existingUserIds.has(membership.user_id)) {
          const fullName = profile.full_name || "User";
          const nameParts = fullName.split(" ");
          membershipPeople.push({
            id: membership.user_id, // Use user_id as temporary id
            organisation_id: orgId,
            first_name: nameParts[0] || "User",
            last_name: nameParts.slice(1).join(" ") || "",
            email: profile.email || null,
            phone: null,
            status: "active",
            created_at: new Date().toISOString(),
            user_id: membership.user_id,
            source: "membership",
          });
        }
      }
    }

    // Merge people from both sources
    const peopleFromTable = (peopleData ?? []).map((p) => ({
      ...p,
      source: "people" as const,
    }));

    const allPeople = [...peopleFromTable, ...membershipPeople];
    setPeople(allPeople);
  }, [orgId, supabase]);

  const loadOrganisationContext = useCallback(async () => {
    if (!orgId) return false;

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

    const { data: membership, error: membershipError } = await supabase
      .from("organisation_memberships")
      .select(
        `
          roles (
            code
          )
        `,
      )
      .eq("organisation_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle<OrganisationMembership>();

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

    const roles = membership.roles;

    const roleCode = Array.isArray(roles)
      ? (roles[0]?.code?.toLowerCase() ?? "member")
      : (roles?.code?.toLowerCase() ?? "member");

    setUserRole(roleCode);

    const manageableRoles = ["manager", "owner", "admin"];

    setCanManage(manageableRoles.includes(roleCode));

    return true;
  }, [orgId, router, supabase]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      if (!orgId) return;

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const hasAccess = await loadOrganisationContext();

        if (!mounted || !hasAccess) {
          return;
        }

        await loadPeopleData();
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
  }, [orgId, loadOrganisationContext, loadPeopleData]);

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

      // If email matches a user, also update their profile name
      if (cleanEmail) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (profileData?.id) {
          const fullName = `${cleanFirstName} ${cleanLastName || ""}`.trim();
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
            })
            .eq("id", profileData.id);

          if (profileError) {
            console.warn("Failed to sync profile name:", profileError);
          }
        }
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

    const person = people.find((p) => p.id === personId);

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

    // If this person has a user_id, also update their membership status
    if (person?.user_id) {
      const { error: membershipError } = await supabase
        .from("organisation_memberships")
        .update({
          status: "removed",
          removed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organisation_id", orgId)
        .eq("user_id", person.user_id);

      if (membershipError) {
        console.warn("Failed to sync membership status:", membershipError);
      }
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

    const person = people.find((p) => p.id === personId);

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

    // If this person has a user_id, also update their membership status
    if (person?.user_id) {
      const { error: membershipError } = await supabase
        .from("organisation_memberships")
        .update({
          status: "active",
          removed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("organisation_id", orgId)
        .eq("user_id", person.user_id);

      if (membershipError) {
        console.warn("Failed to sync membership status:", membershipError);
      }
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
    return (
      <div className="min-h-screen bg-(--background) p-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-(--muted)">
            Loading organisation directory...
          </p>
        </div>
      </div>
    );
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-(--border) bg-(--background)">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-(--muted) uppercase tracking-wider">
                      S/N
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-(--muted) uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-(--muted) uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-(--muted) uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-(--muted) uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {people.map((person, index) => {
                    const fullName = [person.first_name, person.last_name]
                      .filter(Boolean)
                      .join(" ");

                    const isActive = person.status.toLowerCase() === "active";

                    return (
                      <tr
                        key={person.id}
                        className="transition-colors hover:bg-(--background)/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-(--foreground)">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border) bg-(--primary)/10">
                              <span className="font-semibold text-(--primary)">
                                {person.first_name?.[0]?.toUpperCase() || "P"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-(--foreground)">
                                {fullName || "Unnamed person"}
                              </p>
                              {person.source === "membership" && (
                                <p className="text-xs text-(--muted)">Member</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {person.email && (
                              <p className="text-(--foreground)">
                                {person.email}
                              </p>
                            )}
                            {person.phone && (
                              <p className="text-xs text-(--muted)">
                                {person.phone}
                              </p>
                            )}
                            {!person.email && !person.phone && (
                              <p className="text-xs text-(--muted)">-</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={
                              isActive
                                ? "inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600"
                                : "inline-flex rounded-full bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-500"
                            }
                          >
                            {person.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
