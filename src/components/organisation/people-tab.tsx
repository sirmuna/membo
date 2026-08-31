"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`bg-(--border) rounded ${className}`} />;
}

function PeopleTabSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-40" />
          <SkeletonLine className="h-4 w-64" />
        </div>
        {canManage && <SkeletonLine className="h-10 w-40 rounded-lg" />}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SkeletonLine className="h-10 flex-1 rounded-lg" />
        <SkeletonLine className="h-10 w-32 rounded-lg" />
      </div>

      {/* People Table */}
      <div className="bg-(--surface) border border-(--border) rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-(--border)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-(--border) shrink-0" />
                <div className="space-y-2">
                  <SkeletonLine className="h-4 w-32" />
                  <SkeletonLine className="h-3 w-48" />
                </div>
              </div>
              <div className="flex gap-2">
                <SkeletonLine className="h-8 w-20 rounded-lg" />
                {canManage && <SkeletonLine className="h-8 w-20 rounded-lg" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Person {
  id: string;
  organisation_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

interface CustomFieldDef {
  id: string;
  organisation_id: string;
  entity_type: "person";
  field_name: string;
  field_type: "text" | "number" | "date" | "select";
  options: string[] | null;
  created_at: string;
}

interface PeopleTabProps {
  organisationId: string;
  userRole?: string;
}

type CustomFieldValue = string;

export function PeopleTab({ organisationId, userRole }: PeopleTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [people, setPeople] = useState<Person[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  // Person form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [personCustomValues, setPersonCustomValues] = useState<
    Record<string, CustomFieldValue>
  >({});

  const [duplicateWarning, setDuplicateWarning] = useState<Person[] | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);

  // New custom field form state
  const [newFieldName, setNewFieldName] = useState("");

  const [newFieldType, setNewFieldType] = useState<
    "text" | "number" | "date" | "select"
  >("text");

  /*
   * Convert a custom field name into the key used inside
   * people.custom_fields.
   *
   * Example:
   * "Student Level" -> "student_level"
   */
  function getCustomFieldKey(fieldName: string): string {
    return fieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /*
   * Check whether the current user can manage people.
   */
  const canManagePeople =
    userRole !== undefined &&
    ["owner", "admin"].includes(userRole.toLowerCase());

  /*
   * Fetch people and custom field definitions.
   *
   * We intentionally select only columns that actually exist
   * in the current custom_field_definitions schema.
   */
  const fetchData = useCallback(async () => {
    if (!organisationId) {
      setPeople([]);
      setCustomFields([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * 1. Fetch people.
       */
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
            avatar_url,
            status,
            custom_fields,
            created_at
          `,
        )
        .eq("organisation_id", organisationId)
        .order("created_at", {
          ascending: false,
        });

      if (peopleError) {
        throw peopleError;
      }

      /*
       * 2. Fetch custom field definitions.
       *
       * IMPORTANT:
       * There is NO field_key column in the database.
       */
      const { data: fieldDefs, error: fieldError } = await supabase
        .from("custom_field_definitions")
        .select(
          `
            id,
            organisation_id,
            entity_type,
            field_name,
            field_type,
            options,
            created_at
          `,
        )
        .eq("organisation_id", organisationId)
        .eq("entity_type", "person")
        .order("created_at", {
          ascending: true,
        });

      if (fieldError) {
        throw fieldError;
      }

      setPeople((peopleData || []) as Person[]);
      setCustomFields((fieldDefs || []) as CustomFieldDef[]);
    } catch (err) {
      console.error("Error fetching people data:", err);

      const message =
        err instanceof Error ? err.message : "Failed to load people data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [organisationId, supabase]);

  /*
   * Initial / organisation-change data loading.
   *
   * The timeout prevents the React cascading-render warning caused
   * by calling fetchData(), which updates state, directly inside
   * the effect body.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchData]);

  /*
   * Open create modal.
   */
  function handleOpenCreate() {
    setEditingPerson(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPersonCustomValues({});
    setDuplicateWarning(null);
    setError("");
    setShowAddModal(true);
  }

  /*
   * Open edit modal.
   */
  function handleOpenEdit(person: Person) {
    setEditingPerson(person);
    setFirstName(person.first_name);
    setLastName(person.last_name);
    setEmail(person.email || "");
    setPhone(person.phone || "");
    setPersonCustomValues(
      (person.custom_fields || {}) as Record<string, string>,
    );
    setDuplicateWarning(null);
    setError("");
    setShowAddModal(true);
  }

  /*
   * Check for possible duplicate records.
   */
  function checkDuplicates(): Person[] {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    return people.filter((person) => {
      if (editingPerson && person.id === editingPerson.id) {
        return false;
      }

      const emailMatch =
        Boolean(trimmedEmail) &&
        Boolean(person.email) &&
        person.email!.toLowerCase() === trimmedEmail;

      const phoneMatch =
        Boolean(trimmedPhone) &&
        Boolean(person.phone) &&
        person.phone === trimmedPhone;

      return emailMatch || phoneMatch;
    });
  }

  /*
   * Save person.
   * Also syncs name changes to profiles table if user_id exists.
   */
  async function handleSavePerson(bypassDuplicateCheck = false) {
    if (!firstName.trim() || !lastName.trim()) {
      window.addToast?.("First and Last name are required.", "error");
      return;
    }

    if (!bypassDuplicateCheck) {
      const duplicates = checkDuplicates();

      if (duplicates.length > 0) {
        setDuplicateWarning(duplicates);
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        organisation_id: organisationId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        custom_fields: personCustomValues,
      };

      if (editingPerson) {
        const { error: updateError } = await supabase
          .from("people")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPerson.id)
          .eq("organisation_id", organisationId);

        if (updateError) {
          throw updateError;
        }

        // If this person has a user_id, also update their profile name
        if (editingPerson.user_id) {
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
            })
            .eq("id", editingPerson.user_id);

          if (profileError) {
            console.warn("Failed to sync profile name:", profileError);
          }
        }

        window.addToast?.("Person profile updated successfully.", "success");
      } else {
        const { error: insertError } = await supabase.from("people").insert({
          ...payload,
          status: "active",
        });

        if (insertError) {
          throw insertError;
        }

        window.addToast?.("Person created successfully.", "success");
      }

      setShowAddModal(false);
      setEditingPerson(null);
      setDuplicateWarning(null);

      await fetchData();
    } catch (err) {
      console.error("Error saving person:", err);

      const message =
        err instanceof Error ? err.message : "Failed to save person.";

      setError(message);
      window.addToast?.(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Toggle person status.
   * Also syncs with organisation_memberships if this person has a user_id.
   */
  async function handleToggleStatus(person: Person) {
    const newStatus = person.status === "active" ? "inactive" : "active";

    try {
      const { error: updateError } = await supabase
        .from("people")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", person.id)
        .eq("organisation_id", organisationId);

      if (updateError) {
        throw updateError;
      }

      // If this person has a user_id, also update their membership status
      if (person.user_id) {
        const membershipStatus = newStatus === "active" ? "active" : "removed";
        const { error: membershipError } = await supabase
          .from("organisation_memberships")
          .update({
            status: membershipStatus,
            removed_at:
              newStatus === "inactive" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("organisation_id", organisationId)
          .eq("user_id", person.user_id);

        if (membershipError) {
          console.warn("Failed to sync membership status:", membershipError);
        }
      }

      window.addToast?.(`Person status changed to ${newStatus}.`, "info");

      await fetchData();
    } catch (err) {
      console.error("Failed to update status:", err);

      const message =
        err instanceof Error ? err.message : "Failed to update status.";

      setError(message);
      window.addToast?.(message, "error");
    }
  }

  /*
   * Create custom field definition.
   *
   * IMPORTANT:
   * field_key does NOT exist in the database.
   *
   * We store:
   * - organisation_id
   * - entity_type
   * - field_name
   * - field_type
   * - options
   */
  async function handleCreateCustomField(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = newFieldName.trim();

    if (!trimmedName) {
      window.addToast?.("Custom field name is required.", "error");
      return;
    }

    const existingField = customFields.some(
      (field) =>
        field.field_name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingField) {
      window.addToast?.(
        "A custom field with this name already exists.",
        "warning",
      );
      return;
    }

    const fieldKey = getCustomFieldKey(trimmedName);

    if (!fieldKey) {
      window.addToast?.("Please provide a valid custom field name.", "error");
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("custom_field_definitions")
        .insert({
          organisation_id: organisationId,
          entity_type: "person",
          field_name: trimmedName,
          field_type: newFieldType,
          options: newFieldType === "select" ? [] : null,
        });

      if (insertError) {
        throw insertError;
      }

      window.addToast?.("Custom field added successfully.", "success");

      setNewFieldName("");
      setNewFieldType("text");

      await fetchData();
    } catch (err) {
      console.error("Error creating custom field:", err);

      const message =
        err instanceof Error ? err.message : "Failed to create custom field.";

      setError(message);
      window.addToast?.(message, "error");
    }
  }

  /*
   * Get the stored value for a custom field.
   */
  function getCustomFieldValue(person: Person, field: CustomFieldDef): string {
    const customValues = person.custom_fields || {};
    const key = getCustomFieldKey(field.field_name);

    const value = customValues[key];

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  }

  /*
   * Update a custom field value for the current person form.
   */
  function handleCustomFieldChange(field: CustomFieldDef, value: string) {
    const key = getCustomFieldKey(field.field_name);

    setPersonCustomValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /*
   * CSV export.
   */
  function handleExportCSV() {
    if (people.length === 0) {
      window.addToast?.("There are no people to export.", "warning");
      return;
    }

    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Status",
      "Joined Date",
    ];

    customFields.forEach((field) => {
      headers.push(field.field_name);
    });

    const escapeCSV = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = people.map((person) => {
      const baseRow = [
        escapeCSV(person.first_name),
        escapeCSV(person.last_name),
        escapeCSV(person.email || ""),
        escapeCSV(person.phone || ""),
        escapeCSV(person.status),
        escapeCSV(new Date(person.created_at).toLocaleDateString()),
      ];

      customFields.forEach((field) => {
        baseRow.push(escapeCSV(getCustomFieldValue(person, field)));
      });

      return baseRow.join(",");
    });

    const csvContent = [headers.map(escapeCSV).join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `people-export-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*
   * Filtered people.
   */
  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return people.filter((person) => {
      const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        Boolean(person.email?.toLowerCase().includes(query)) ||
        Boolean(person.phone?.includes(searchQuery.trim()));

      const matchesStatus =
        statusFilter === "all" || person.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [people, searchQuery, statusFilter]);

  const totalCount = people.length;

  const activeCount = people.filter(
    (person) => person.status === "active",
  ).length;

  const inactiveCount = totalCount - activeCount;

  if (loading) {
    return <PeopleTabSkeleton canManage={canManagePeople} />;
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
            Total People
          </p>

          <p className="mt-2 text-3xl font-bold text-(--foreground)">
            {totalCount}
          </p>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
            Active People
          </p>

          <p className="mt-2 text-3xl font-bold text-(--success)">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
            Inactive People
          </p>

          <p className="mt-2 text-3xl font-bold text-(--muted)">
            {inactiveCount}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-(--error)/20 bg-(--error)/5 p-4 text-sm text-(--error)">
          {error}
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-md flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-sm text-(--foreground) placeholder:text-(--muted) focus:outline-none focus:ring-2 focus:ring-(--primary)"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "active" | "inactive",
              )
            }
            className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canManagePeople && (
            <button
              type="button"
              onClick={() => setShowCustomFieldsModal(true)}
              className="rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-(--foreground) transition-colors hover:bg-(--primary)/10"
            >
              Custom Fields ({customFields.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium text-(--foreground) transition-colors hover:bg-(--primary)/10"
          >
            Export CSV
          </button>

          {canManagePeople && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--primary-dark)"
            >
              + Add Person
            </button>
          )}
        </div>
      </div>

      {/* People Table */}
      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface) shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-(--muted)">
            Loading people records...
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="p-8 text-center text-(--muted)">
            No people found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-(--foreground)">
              <thead className="border-b border-(--border) bg-(--background) text-xs font-semibold uppercase text-(--muted)">
                <tr>
                  <th className="w-12 px-6 py-3">S/N</th>

                  <th className="px-6 py-3">Name</th>

                  <th className="px-6 py-3">Contact</th>

                  <th className="px-6 py-3">Status</th>

                  {customFields.map((field) => (
                    <th key={field.id} className="px-6 py-3">
                      {field.field_name}
                    </th>
                  ))}

                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-(--border)">
                {filteredPeople.map((person, index) => (
                  <tr
                    key={person.id}
                    className="transition-colors hover:bg-(--background)/50"
                  >
                    <td className="px-6 py-4 text-xs text-(--muted)">
                      {index + 1}
                    </td>

                    <td className="px-6 py-4 font-medium text-(--foreground)">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--primary)/20 text-xs font-bold text-(--primary)">
                          {person.first_name[0]}
                          {person.last_name?.[0] || ""}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {person.first_name} {person.last_name}
                          </p>

                          <p className="text-xs text-(--muted)">
                            Added{" "}
                            {new Date(person.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm">{person.email || "—"}</p>

                      <p className="text-xs text-(--muted)">
                        {person.phone || "—"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={
                          person.status === "active"
                            ? "inline-flex rounded-full bg-(--success)/10 px-2.5 py-0.5 text-xs font-semibold text-(--success)"
                            : "inline-flex rounded-full bg-(--muted)/10 px-2.5 py-0.5 text-xs font-semibold text-(--muted)"
                        }
                      >
                        {person.status}
                      </span>
                    </td>

                    {customFields.map((field) => (
                      <td
                        key={field.id}
                        className="px-6 py-4 text-xs text-(--muted)"
                      >
                        {getCustomFieldValue(person, field) || "—"}
                      </td>
                    ))}

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManagePeople && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(person)}
                              className="text-xs font-semibold text-(--primary) hover:underline"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(person)}
                              className="text-xs font-semibold text-(--muted) hover:text-(--foreground)"
                            >
                              {person.status === "active"
                                ? "Deactivate"
                                : "Reactivate"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Person Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-(--foreground)">
                {editingPerson ? "Edit Person Profile" : "Add New Person"}
              </h2>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-lg text-(--muted) hover:text-(--foreground)"
              >
                ✕
              </button>
            </div>

            {duplicateWarning ? (
              <div className="mb-4 rounded-lg border border-(--warning)/30 bg-(--warning)/10 p-4">
                <p className="mb-1 text-sm font-semibold text-(--warning)">
                  Potential Duplicate Record Detected!
                </p>

                <p className="mb-3 text-xs text-(--muted)">
                  Matching person found with similar email or phone:
                </p>

                {duplicateWarning.map((duplicate) => (
                  <p
                    key={duplicate.id}
                    className="text-xs font-medium text-(--foreground)"
                  >
                    • {duplicate.first_name} {duplicate.last_name} (
                    {duplicate.email || duplicate.phone || "No contact"})
                  </p>
                ))}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="rounded-lg border border-(--border) px-3 py-1.5 text-xs font-semibold text-(--foreground)"
                  >
                    Cancel / Fix Details
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSavePerson(true)}
                    className="rounded-lg bg-(--primary) px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Save Anyway
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSavePerson();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-(--muted)">
                      First Name *
                    </label>

                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-(--muted)">
                      Last Name *
                    </label>

                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-(--muted)">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-(--muted)">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                  />
                </div>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-3 border-t border-(--border) pt-4">
                    <p className="text-xs font-semibold uppercase text-(--muted)">
                      Custom Fields
                    </p>

                    {customFields.map((field) => {
                      const key = getCustomFieldKey(field.field_name);

                      const value = personCustomValues[key] || "";

                      return (
                        <div key={field.id}>
                          <label className="mb-1 block text-xs font-medium text-(--muted)">
                            {field.field_name}
                          </label>

                          {field.field_type === "select" &&
                          field.options &&
                          field.options.length > 0 ? (
                            <select
                              value={value}
                              onChange={(event) =>
                                handleCustomFieldChange(
                                  field,
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                            >
                              <option value="">-- Select --</option>

                              {field.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={
                                field.field_type === "number"
                                  ? "number"
                                  : field.field_type === "date"
                                    ? "date"
                                    : "text"
                              }
                              value={value}
                              onChange={(event) =>
                                handleCustomFieldChange(
                                  field,
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--muted) hover:text-(--foreground)"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-dark) disabled:opacity-50"
                  >
                    {submitting
                      ? "Saving..."
                      : editingPerson
                        ? "Update Profile"
                        : "Save Person"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Custom Fields Manager Modal */}
      {showCustomFieldsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-(--foreground)">
                    Organisation Custom Fields
                  </h2>

                  <p className="mt-1 text-xs text-(--muted)">
                    Define custom fields for people, such as Department, Student
                    Level, Membership Number, or other organisation-specific
                    information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomFieldsModal(false)}
                  className="text-lg text-(--muted) hover:text-(--foreground)"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomField} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--muted)">
                    Field Name
                  </label>

                  <input
                    type="text"
                    required
                    placeholder="e.g. Student Level"
                    value={newFieldName}
                    onChange={(event) => setNewFieldName(event.target.value)}
                    className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                  />

                  {newFieldName.trim() && (
                    <p className="mt-1 text-[11px] text-(--muted)">
                      Internal key:{" "}
                      <span className="font-mono">
                        {getCustomFieldKey(newFieldName)}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-(--muted)">
                    Field Type
                  </label>

                  <select
                    value={newFieldType}
                    onChange={(event) =>
                      setNewFieldType(
                        event.target.value as
                          | "text"
                          | "number"
                          | "date"
                          | "select",
                      )
                    }
                    className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                  >
                    <option value="text">Text</option>

                    <option value="number">Number</option>

                    <option value="date">Date</option>

                    <option value="select">Select</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-(--primary) py-2 text-sm font-semibold text-white hover:bg-(--primary-dark)"
                >
                  + Add Custom Field
                </button>
              </form>

              <div className="border-t border-(--border) pt-3">
                <p className="mb-2 text-xs font-semibold text-(--muted)">
                  Existing Custom Fields
                </p>

                {customFields.length === 0 ? (
                  <p className="text-xs text-(--muted)">
                    No custom fields defined yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {customFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded bg-(--background) px-2 py-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-(--foreground)">
                            {field.field_name}
                          </span>

                          <p className="font-mono text-[10px] text-(--muted)">
                            {getCustomFieldKey(field.field_name)}
                          </p>
                        </div>

                        <span className="font-mono text-(--muted)">
                          {field.field_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFieldsModal(false)}
                  className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--foreground)"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
