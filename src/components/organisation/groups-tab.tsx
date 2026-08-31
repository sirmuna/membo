"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GroupType {
  id: string;
  organisation_id: string;
  name: string;
}

interface Person {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  status: string;
}

interface GroupMembership {
  id: string;
  group_id: string;
  person_id: string;
  role_in_group: string;
  added_at: string;
  person?: Person | null;
}

interface Group {
  id: string;
  organisation_id: string;
  group_type_id: string | null;
  parent_group_id: string | null;
  name: string;
  archived_at: string | null;
  created_at: string;
  description: string | null;
  group_type?: GroupType | GroupType[] | null;
  member_count?: number;
}

interface GroupsTabProps {
  organisationId: string;
  userRole?: string;
}

export function GroupsTab({ organisationId, userRole }: GroupsTabProps) {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupTypeId, setGroupTypeId] = useState("");
  const [parentGroupId, setParentGroupId] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const [groupMembers, setGroupMembers] = useState<GroupMembership[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [personToAdd, setPersonToAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [groupActionLoading, setGroupActionLoading] = useState(false);

  const canManageGroups =
    userRole !== undefined &&
    ["owner", "admin"].includes(userRole.toLowerCase());

  /*
   * Load organisation data.
   */
  const fetchData = useCallback(async () => {
    if (!organisationId) return;

    setLoading(true);
    setError("");

    try {
      /*
       * Group types
       */
      const { data: groupTypesData, error: groupTypesError } = await supabase
        .from("group_types")
        .select("id, organisation_id, name")
        .eq("organisation_id", organisationId)
        .order("name");

      if (groupTypesError) {
        throw groupTypesError;
      }

      setGroupTypes(groupTypesData || []);

      /*
       * Organisation people.
       */
      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select("id, first_name, last_name, email, status")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .order("first_name");

      if (peopleError) {
        throw peopleError;
      }

      setPeople(peopleData || []);

      /*
       * Groups.
       *
       * Notice that we deliberately do NOT select:
       * - group_type
       * - leader_person_id
       * - status
       * - updated_at
       */
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(
          `
            id,
            organisation_id,
            group_type_id,
            parent_group_id,
            name,
            archived_at,
            created_at,
            description,
            group_type:group_types (
              id,
              organisation_id,
              name
            )
          `,
        )
        .eq("organisation_id", organisationId)
        .order("created_at", {
          ascending: false,
        });

      if (groupsError) {
        throw groupsError;
      }

      /*
       * Fetch member counts.
       */
      const enhancedGroups = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from("group_memberships")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("group_id", group.id);

          if (countError) {
            console.error("Failed to fetch member count:", countError);
          }

          return {
            ...group,
            member_count: count || 0,
          };
        }),
      );

      setGroups(enhancedGroups);
    } catch (err) {
      console.error("Error loading groups:", err);

      setError(err instanceof Error ? err.message : "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [organisationId, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  /*
   * Reset group form.
   */
  function resetGroupForm() {
    setEditingGroup(null);
    setName("");
    setDescription("");
    setGroupTypeId("");
    setParentGroupId("");
  }

  /*
   * Create group.
   */
  function handleOpenCreate() {
    resetGroupForm();
    setError("");
    setShowGroupModal(true);
  }

  /*
   * Edit group.
   */
  function handleOpenEdit(group: Group) {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || "");
    setGroupTypeId(group.group_type_id || "");
    setParentGroupId(group.parent_group_id || "");
    setError("");
    setShowGroupModal(true);
  }

  /*
   * Create / update group.
   */
  async function handleSaveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        group_type_id: groupTypeId || null,
        parent_group_id: parentGroupId || null,
      };

      if (editingGroup) {
        const { error: updateError } = await supabase
          .from("groups")
          .update(payload)
          .eq("id", editingGroup.id)
          .eq("organisation_id", organisationId);

        if (updateError) {
          throw updateError;
        }

        window.addToast?.("Group updated successfully.", "success");
      } else {
        const { error: insertError } = await supabase.from("groups").insert({
          organisation_id: organisationId,
          ...payload,
        });

        if (insertError) {
          throw insertError;
        }

        window.addToast?.("Group created successfully.", "success");
      }

      setShowGroupModal(false);
      resetGroupForm();

      await fetchData();
    } catch (err) {
      console.error("Error saving group:", err);

      const message =
        err instanceof Error ? err.message : "Failed to save group.";

      setError(message);
      window.addToast?.(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Archive / restore.
   *
   * groups uses archived_at rather than status.
   */
  async function handleToggleArchive(group: Group) {
    setGroupActionLoading(true);
    setError("");

    try {
      const archived = Boolean(group.archived_at);

      const { error: updateError } = await supabase
        .from("groups")
        .update({
          archived_at: archived ? null : new Date().toISOString(),
        })
        .eq("id", group.id)
        .eq("organisation_id", organisationId);

      if (updateError) {
        throw updateError;
      }

      window.addToast?.(
        archived
          ? "Group restored successfully."
          : "Group archived successfully.",
        "success",
      );

      await fetchData();
    } catch (err) {
      console.error("Error changing group archive state:", err);

      const message =
        err instanceof Error ? err.message : "Failed to update group.";

      setError(message);
      window.addToast?.(message, "error");
    } finally {
      setGroupActionLoading(false);
    }
  }

  /*
   * Load members for a group.
   */
  async function fetchGroupMembers(groupId: string) {
    setMembersLoading(true);
    setError("");

    try {
      const { data, error: membersError } = await supabase
        .from("group_memberships")
        .select(
          `
            id,
            group_id,
            person_id,
            role_in_group,
            added_at,
            person:people (
              id,
              first_name,
              last_name,
              email,
              status
            )
          `,
        )
        .eq("group_id", groupId)
        .order("added_at", {
          ascending: true,
        });

      if (membersError) {
        throw membersError;
      }

      const normalizedMembers: GroupMembership[] = (data || []).map(
        (membership) => ({
          ...membership,
          person: Array.isArray(membership.person)
            ? (membership.person[0] ?? undefined)
            : (membership.person ?? undefined),
        }),
      );

      setGroupMembers(normalizedMembers);
    } catch (err) {
      console.error("Error loading group members:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load group members.",
      );
    } finally {
      setMembersLoading(false);
    }
  }

  /*
   * Open members modal.
   */
  async function handleManageMembers(group: Group) {
    setSelectedGroup(group);
    setPersonToAdd("");
    setShowMembersModal(true);

    await fetchGroupMembers(group.id);
  }

  /*
   * Add person to group.
   *
   * Default role is member.
   */
  async function handleAddGroupMember() {
    if (!selectedGroup || !personToAdd) return;

    setAddingMember(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("group_memberships")
        .insert({
          group_id: selectedGroup.id,
          person_id: personToAdd,
          role_in_group: "member",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          window.addToast?.(
            "This person is already a member of the group.",
            "warning",
          );
          return;
        }

        throw insertError;
      }

      window.addToast?.("Member added to group.", "success");

      setPersonToAdd("");

      await fetchGroupMembers(selectedGroup.id);

      await fetchData();
    } catch (err) {
      console.error("Error adding group member:", err);

      const message =
        err instanceof Error ? err.message : "Failed to add member.";

      setError(message);
      window.addToast?.(message, "error");
    } finally {
      setAddingMember(false);
    }
  }

  /*
   * Remove member from group.
   */
  async function handleRemoveGroupMember(membership: GroupMembership) {
    if (!selectedGroup) return;

    const person = membership.person;

    const name = person
      ? `${person.first_name} ${person.last_name || ""}`.trim()
      : "this member";

    const confirmed = window.confirm(
      `Remove ${name} from ${selectedGroup.name}?`,
    );

    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("group_memberships")
        .delete()
        .eq("id", membership.id)
        .eq("group_id", selectedGroup.id);

      if (deleteError) {
        throw deleteError;
      }

      window.addToast?.("Member removed from group.", "info");

      await fetchGroupMembers(selectedGroup.id);

      await fetchData();
    } catch (err) {
      console.error("Error removing group member:", err);

      const message =
        err instanceof Error ? err.message : "Failed to remove member.";

      setError(message);
      window.addToast?.(message, "error");
    }
  }

  /*
   * Appoint / remove Group Leader.
   *
   * Leadership is represented by role_in_group.
   */
  async function handleToggleLeader(membership: GroupMembership) {
    if (!selectedGroup) return;

    const isLeader = membership.role_in_group === "leader";

    const nextRole = isLeader ? "member" : "leader";

    try {
      const { error: updateError } = await supabase
        .from("group_memberships")
        .update({
          role_in_group: nextRole,
        })
        .eq("id", membership.id)
        .eq("group_id", selectedGroup.id);

      if (updateError) {
        throw updateError;
      }

      window.addToast?.(
        isLeader ? "Group Leader role removed." : "Group Leader appointed.",
        "success",
      );

      await fetchGroupMembers(selectedGroup.id);
    } catch (err) {
      console.error("Error changing Group Leader:", err);

      const message =
        err instanceof Error ? err.message : "Failed to update Group Leader.";

      setError(message);
      window.addToast?.(message, "error");
    }
  }

  /*
   * Only show active groups in the main grid.
   */
  const activeGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groups.filter((group) => {
      if (group.archived_at) {
        return false;
      }

      if (filterType && group.group_type_id !== filterType) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        group.name.toLowerCase().includes(query) ||
        (group.description || "").toLowerCase().includes(query)
      );
    });
  }, [groups, search, filterType]);

  const archivedGroups = useMemo(
    () => groups.filter((group) => Boolean(group.archived_at)),
    [groups],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Organisation Groups
          </h2>

          <p className="text-xs text-[var(--muted)]">
            Organise organisation members into departments, teams, classes,
            units and other groups.
          </p>
        </div>

        {canManageGroups && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] transition-colors"
          >
            + Create Group
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 p-4 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {/* Search / Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        >
          <option value="">All Group Types</option>

          {groupTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
          Loading groups...
        </div>
      ) : activeGroups.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {search || filterType
              ? "No groups match your filters."
              : "No groups created yet."}
          </p>

          {!search && !filterType && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Create your first group to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col justify-between shadow-sm hover:border-[var(--primary)]/50 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 text-xs font-semibold">
                    {Array.isArray(group.group_type)
                      ? group.group_type[0]?.name || "General"
                      : group.group_type?.name || "General"}{" "}
                  </span>

                  <span className="text-xs text-[var(--muted)]">
                    {group.member_count || 0}{" "}
                    {(group.member_count || 0) === 1 ? "Member" : "Members"}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  {group.name}
                </h3>

                <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1">
                  {group.description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                {canManageGroups && (
                  <button
                    type="button"
                    onClick={() => handleManageMembers(group)}
                    className="text-xs font-semibold text-[var(--primary)] hover:underline"
                  >
                    Manage Members
                  </button>
                )}

                {canManageGroups && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={groupActionLoading}
                      onClick={() => handleToggleArchive(group)}
                      className="text-xs text-[var(--error)] hover:underline disabled:opacity-50"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived Groups */}
      {archivedGroups.length > 0 && canManageGroups && (
        <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <summary className="cursor-pointer p-4 text-sm font-semibold text-[var(--foreground)]">
            Archived Groups ({archivedGroups.length})
          </summary>

          <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
            {archivedGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {group.name}
                  </p>

                  <p className="text-xs text-[var(--muted)]">
                    {Array.isArray(group.group_type)
                      ? group.group_type[0]?.name || "General"
                      : group.group_type?.name || "General"}{" "}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={groupActionLoading}
                  onClick={() => handleToggleArchive(group)}
                  className="text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Create / Edit Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                {editingGroup ? "Edit Group" : "Create New Group"}
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowGroupModal(false);
                  resetGroupForm();
                }}
                className="text-lg text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Group Name *
                </label>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Youth Choir"
                  className="w-full rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Group Type
                </label>

                <select
                  value={groupTypeId}
                  onChange={(e) => setGroupTypeId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  <option value="">-- No Group Type --</option>

                  {groupTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Parent Group
                </label>

                <select
                  value={parentGroupId}
                  onChange={(e) => setParentGroupId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  <option value="">-- No Parent Group --</option>

                  {groups
                    .filter(
                      (group) =>
                        group.id !== editingGroup?.id && !group.archived_at,
                    )
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    resetGroupForm();
                  }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingGroup
                      ? "Save Changes"
                      : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  {selectedGroup.name}
                </h2>

                <p className="text-xs text-[var(--muted)]">
                  Manage members and Group Leaders.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMembersModal(false);
                  setSelectedGroup(null);
                  setGroupMembers([]);
                }}
                className="text-lg text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {/* Add Member */}
            {canManageGroups && (
              <div className="mb-5 flex flex-col sm:flex-row gap-2">
                <select
                  value={personToAdd}
                  onChange={(e) => setPersonToAdd(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-(--background) px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  <option value="">-- Select Organisation Member --</option>

                  {people
                    .filter(
                      (person) =>
                        !groupMembers.some(
                          (membership) => membership.person_id === person.id,
                        ),
                    )
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.first_name} {person.last_name || ""}
                        {person.email ? ` — ${person.email}` : ""}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  disabled={!personToAdd || addingMember}
                  onClick={handleAddGroupMember}
                  className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </button>
              </div>
            )}

            {/* Members */}
            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              {membersLoading ? (
                <div className="p-8 text-center text-sm text-[var(--muted)]">
                  Loading members...
                </div>
              ) : groupMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[var(--foreground)]">
                    No members in this group yet.
                  </p>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Select an organisation member above to add them.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {groupMembers.map((membership) => {
                    const person = membership.person;

                    if (!person) {
                      return null;
                    }

                    const fullName = `${person.first_name} ${
                      person.last_name || ""
                    }`.trim();

                    const isLeader = membership.role_in_group === "leader";

                    return (
                      <div
                        key={membership.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--foreground)]">
                              {fullName}
                            </p>

                            {isLeader && (
                              <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[var(--primary)] text-[10px] font-bold uppercase">
                                Group Leader
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--muted)]">
                            {person.email || "No email"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {canManageGroups && (
                            <button
                              type="button"
                              onClick={() => handleToggleLeader(membership)}
                              className="text-xs font-semibold text-[var(--primary)] hover:underline"
                            >
                              {isLeader ? "Remove Leader" : "Make Leader"}
                            </button>
                          )}

                          {canManageGroups && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGroupMember(membership)}
                              className="text-xs font-medium text-[var(--error)] hover:underline"
                            >
                              Remove
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
      )}
    </div>
  );
}
