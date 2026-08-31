"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface MembersTabProps {
  organisationId: string;
  userRole: string;
  organisationStatus: string;
}

interface Role {
  id: string;
  code: string;
  label: string;
  description?: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  status: string;
  role_id: string | null;
  profiles?: Profile | null;
  roles?: Role | null;
}

interface JoinRequest {
  id: string;
  organisation_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  profiles?: Profile | null;
}

interface Invitation {
  id: string;
  organisation_id: string;
  invited_email: string;
  invited_by: string;
  role_id: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  roles?: Role | null;
}

interface OwnershipTransfer {
  id: string;
  organisation_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  expires_at: string;
  created_at?: string;
  accepted_at?: string | null;
  sender?: Profile | null;
  receiver?: Profile | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

/*
 * ---------------------------------------------------------
 * SKELETON
 * ---------------------------------------------------------
 */

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-(--border) rounded ${className}`} aria-hidden="true" />
  );
}

function MembersTabSkeleton({
  isAdminOrOwner,
  userRole,
}: {
  isAdminOrOwner: boolean;
  userRole: string;
}) {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Member Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="bg-(--surface) p-4 rounded-lg border border-(--border)"
          >
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Incoming Transfer */}
      {userRole !== "owner" && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonLine className="h-5 w-56" />
          <SkeletonLine className="h-4 w-80" />
          <SkeletonLine className="h-10 w-40 rounded-lg" />
        </section>
      )}

      {/* Join Requests */}
      {isAdminOrOwner && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonLine className="h-5 w-40" />

          <div className="divide-y divide-(--border)">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-32" />
                  <SkeletonLine className="h-3 w-44" />
                </div>

                <div className="flex gap-2 shrink-0">
                  <SkeletonLine className="h-7 w-16 rounded-lg" />
                  <SkeletonLine className="h-7 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Members */}
      <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
        <SkeletonLine className="h-5 w-48" />

        <div className="divide-y divide-(--border)">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-(--border) shrink-0" />

                <div className="space-y-2">
                  <SkeletonLine className="h-3.5 w-28" />
                  <SkeletonLine className="h-3 w-36" />
                </div>
              </div>

              <SkeletonLine className="h-5 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Invitations */}
      {isAdminOrOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
            <SkeletonLine className="h-5 w-32" />

            <div className="space-y-3">
              <SkeletonLine className="h-9 w-full rounded-lg" />
              <SkeletonLine className="h-9 w-full rounded-lg" />
              <SkeletonLine className="h-9 w-full rounded-lg" />
            </div>
          </section>

          <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
            <SkeletonLine className="h-5 w-40" />

            <div className="space-y-3">
              {[0, 1].map((i) => (
                <SkeletonLine key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Ownership Transfer */}
      {userRole === "owner" && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <SkeletonLine className="h-5 w-56" />
          <SkeletonLine className="h-4 w-72" />
          <SkeletonLine className="h-10 w-full rounded-lg" />
        </section>
      )}
    </div>
  );
}

export function MembersTab({
  organisationId,
  userRole,
  organisationStatus,
}: MembersTabProps) {
  const [supabase] = useState(() => createClient());

  const isReadOnly = organisationStatus === "locked";

  const isAdminOrOwner = userRole === "owner" || userRole === "admin";

  const [loading, setLoading] = useState(true);

  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [stats, setStats] = useState({
    adminCount: 1,
    activeCount: 1,
    inactiveCount: 0,
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviting, setInviting] = useState(false);

  const [transferring, setTransferring] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState("");

  const [pendingOutgoingTransfer, setPendingOutgoingTransfer] =
    useState<OwnershipTransfer | null>(null);

  const [pendingIncomingTransfer, setPendingIncomingTransfer] =
    useState<OwnershipTransfer | null>(null);

  const [acceptingTransfer, setAcceptingTransfer] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        rolesRes,
        membershipsRes,
        peopleRes,
        joinRequestsRes,
        invitationsRes,
        transferRes,
      ] = await Promise.all([
        supabase
          .from("roles")
          .select("id, code, label, description")
          .or(`organisation_id.is.null,organisation_id.eq.${organisationId}`),

        supabase
          .from("organisation_memberships")
          .select(
            `
              id,
              organisation_id,
              user_id,
              role_id,
              status,
              joined_at
            `,
          )
          .eq("organisation_id", organisationId)
          .order("joined_at", { ascending: true }),

        // Also fetch people without accounts for complete count
        supabase
          .from("people")
          .select(
            `
              id,
              organisation_id,
              user_id,
              first_name,
              last_name,
              status,
              created_at
            `,
          )
          .eq("organisation_id", organisationId),

        isAdminOrOwner
          ? supabase
              .from("organisation_join_requests")
              .select(
                `
                  id,
                  organisation_id,
                  user_id,
                  status,
                  requested_at,
                  decided_by,
                  decided_at
                `,
              )
              .eq("organisation_id", organisationId)
              .eq("status", "pending")
              .order("requested_at", {
                ascending: false,
              })
          : Promise.resolve({
              data: [] as JoinRequest[],
              error: null,
            }),

        isAdminOrOwner
          ? supabase
              .from("organisation_invitations")
              .select(
                `
                  id,
                  organisation_id,
                  invited_email,
                  invited_by,
                  role_id,
                  status,
                  token,
                  expires_at,
                  created_at,
                  accepted_at
                `,
              )
              .eq("organisation_id", organisationId)
              .eq("status", "pending")
              .order("created_at", {
                ascending: false,
              })
          : Promise.resolve({
              data: [] as Invitation[],
              error: null,
            }),

        supabase
          .from("ownership_transfers")
          .select(
            `
              id,
              organisation_id,
              from_user_id,
              to_user_id,
              status,
              expires_at,
              created_at
            `,
          )
          .eq("organisation_id", organisationId)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .maybeSingle(),
      ]);

      if (rolesRes.error) {
        throw rolesRes.error;
      }

      if (membershipsRes.error) {
        throw membershipsRes.error;
      }

      const roleList = rolesRes.data ?? [];
      const memberships = membershipsRes.data ?? [];
      const people = peopleRes.data ?? [];

      const roleMap = new Map(roleList.map((role) => [role.id, role]));

      /*
       * Join requests
       */

      let requests: JoinRequest[] = [];

      if (isAdminOrOwner) {
        if (joinRequestsRes.error) {
          console.error("Failed to load join requests:", joinRequestsRes.error);
        } else {
          requests = joinRequestsRes.data ?? [];
        }
      }

      /*
       * Invitations
       */

      let invitationsData: Invitation[] = [];

      if (isAdminOrOwner) {
        if (invitationsRes.error) {
          console.error("Failed to load invitations:", invitationsRes.error);
        } else {
          invitationsData = invitationsRes.data ?? [];
        }
      }

      /*
       * Ownership transfer
       */

      if (transferRes.error) {
        console.error("Failed to load ownership transfer:", transferRes.error);
      }

      const transferData = transferRes.data ?? null;

      /*
       * Collect profile IDs.
       *
       * We need:
       * - member profiles
       * - join-request profiles
       * - transfer sender profile
       * - transfer receiver profile
       */

      const profileIds = new Set<string>();

      memberships.forEach((member) => {
        profileIds.add(member.user_id);
      });

      requests.forEach((request) => {
        profileIds.add(request.user_id);
      });

      if (transferData?.from_user_id) {
        profileIds.add(transferData.from_user_id);
      }

      if (transferData?.to_user_id) {
        profileIds.add(transferData.to_user_id);
      }

      let profiles: Profile[] = [];

      if (profileIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", Array.from(profileIds));

        if (profilesError) {
          console.error("Failed to load profiles:", profilesError);
        } else {
          profiles = profilesData ?? [];
        }
      }

      /*
       * Build lookup map
       */

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile]),
      );

      /*
       * Resolve memberships
       */

      const resolvedMembers: Member[] = memberships.map((membership) => ({
        ...membership,
        profiles: profileMap.get(membership.user_id) ?? null,
        roles: roleMap.get(membership.role_id) ?? null,
      }));

      const active = resolvedMembers.filter(
        (member) => member.status === "active",
      );

      const inactive = resolvedMembers.filter(
        (member) => member.status !== "active",
      );

      /*
       * Admin / owner count
       */

      const ownersAndAdmins = active.filter(
        (member) =>
          member.roles?.code === "owner" || member.roles?.code === "admin",
      );

      /*
       * Combine with people without accounts for accurate counts
       * People with user_id are already counted in memberships
       */
      const peopleWithoutAccounts = people.filter((person) => !person.user_id);

      const activePeopleWithoutAccounts = peopleWithoutAccounts.filter(
        (person) => person.status === "active",
      );

      const inactivePeopleWithoutAccounts = peopleWithoutAccounts.filter(
        (person) => person.status !== "active",
      );

      /*
       * Create member-like objects for people without accounts
       * so they can be displayed in the active/inactive lists
       */
      const peopleWithoutAccountsAsMembers: Member[] =
        peopleWithoutAccounts.map((person) => ({
          id: person.id,
          user_id: person.id, // Use person.id as user_id for consistency
          joined_at: person.created_at || new Date().toISOString(),
          status: person.status,
          role_id: null, // No role for people without accounts
          profiles: {
            id: person.id,
            full_name: `${person.first_name} ${person.last_name || ""}`.trim(),
            email: null,
            avatar_url: null,
          },
          roles: null, // No role for people without accounts
        }));

      const allActive = [
        ...active,
        ...peopleWithoutAccountsAsMembers.filter((p) => p.status === "active"),
      ];
      const allInactive = [
        ...inactive,
        ...peopleWithoutAccountsAsMembers.filter((p) => p.status !== "active"),
      ];

      /*
       * Resolve join requests
       */

      const resolvedRequests: JoinRequest[] = requests.map((request) => ({
        ...request,
        profiles: profileMap.get(request.user_id) ?? null,
      }));

      /*
       * Resolve invitations
       */

      const resolvedInvitations: Invitation[] = invitationsData.map(
        (invitation) => ({
          ...invitation,
          roles: roleMap.get(invitation.role_id) ?? null,
        }),
      );

      /*
       * Resolve ownership transfer.
       *
       * Keep sender and receiver so the UI
       * can determine whether this is incoming
       * or outgoing.
       */

      const resolvedTransfer: OwnershipTransfer | null = transferData
        ? {
            ...transferData,
            sender: profileMap.get(transferData.from_user_id) ?? null,
            receiver: profileMap.get(transferData.to_user_id) ?? null,
          }
        : null;

      /*
       * Split transfer into outgoing/incoming
       * based on the authenticated user.
       */

      let currentUserId: string | null = null;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      currentUserId = user?.id ?? null;

      const outgoingTransfer =
        resolvedTransfer && currentUserId === resolvedTransfer.from_user_id
          ? resolvedTransfer
          : null;

      const incomingTransfer =
        resolvedTransfer && currentUserId === resolvedTransfer.to_user_id
          ? resolvedTransfer
          : null;

      /*
       * Update component state.
       */

      setRoles(roleList);

      setActiveMembers(allActive);

      setInactiveMembers(allInactive);

      setStats({
        adminCount: ownersAndAdmins.length,
        activeCount: active.length + activePeopleWithoutAccounts.length,
        inactiveCount: inactive.length + inactivePeopleWithoutAccounts.length,
      });

      setJoinRequests(isAdminOrOwner ? resolvedRequests : []);

      setInvitations(isAdminOrOwner ? resolvedInvitations : []);

      setPendingOutgoingTransfer(outgoingTransfer);

      setPendingIncomingTransfer(incomingTransfer);
    } catch (err: unknown) {
      console.error("Error loading members tab data:", err);

      setError(
        getErrorMessage(err) || "Failed to load members management data.",
      );

      setActiveMembers([]);
      setInactiveMembers([]);
      setJoinRequests([]);
      setInvitations([]);
      setPendingOutgoingTransfer(null);
      setPendingIncomingTransfer(null);
    } finally {
      setLoading(false);
    }
  }, [organisationId, isAdminOrOwner, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  /*
   * ---------------------------------------------------------
   * ACCEPT OWNERSHIP TRANSFER
   * ---------------------------------------------------------
   */

  async function handleAcceptOwnershipTransfer() {
    if (isReadOnly || !pendingIncomingTransfer || acceptingTransfer) {
      return;
    }

    setError("");
    setSuccess("");
    setAcceptingTransfer(true);

    try {
      /*
       * The database RPC performs the actual ownership transaction.
       *
       * The client does NOT directly:
       * - update the role
       * - delete the previous owner
       * - mark the transfer accepted
       *
       * That logic belongs inside the SECURITY DEFINER RPC.
       */
      const { error: rpcError } = await supabase.rpc(
        "accept_ownership_transfer",
        {
          p_transfer_id: pendingIncomingTransfer.id,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      if (window.addToast) {
        window.addToast(
          "Ownership accepted successfully. You are now the organisation owner.",
          "success",
        );
      }

      /*
       * The user's role has changed and the previous owner has
       * been removed. Refresh the page so the parent dashboard
       * re-evaluates the user's organisation role.
       */
      window.location.reload();
    } catch (err: unknown) {
      console.error("Failed to accept ownership transfer:", err);

      setError(getErrorMessage(err) || "Failed to accept ownership transfer.");
    } finally {
      setAcceptingTransfer(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * JOIN REQUEST APPROVAL / REJECTION
   * ---------------------------------------------------------
   */

  async function handleJoinRequest(requestId: string, approve: boolean) {
    if (isReadOnly) return;

    setError("");
    setSuccess("");

    try {
      console.log("=== APPROVING JOIN REQUEST ===");
      console.log("Request ID:", requestId);
      console.log("Approve:", approve);

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "approve_join_request",
        {
          p_request_id: requestId,
          p_approve: approve,
        },
      );

      console.log("RPC Data:", rpcData);
      console.log("RPC Error:", rpcError);

      if (rpcError) {
        console.error("RPC Error details:", {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code,
        });
        throw rpcError;
      }

      if (window.addToast) {
        window.addToast(
          approve
            ? "Join request approved successfully!"
            : "Join request rejected.",
          approve ? "success" : "info",
        );
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Error handling join request:", err);

      setError(getErrorMessage(err) || "Failed to process join request.");
    }
  }

  /*
   * ---------------------------------------------------------
   * SEND INVITATION
   * ---------------------------------------------------------
   */

  async function handleSendInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isReadOnly || !inviteEmail.trim() || !inviteRoleId) {
      return;
    }

    setError("");
    setSuccess("");
    setInviting(true);

    try {
      const selectedRole = roles.find((role) => role.id === inviteRoleId);

      if (!selectedRole) {
        throw new Error("Selected role could not be found.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You must be signed in to send an invitation.");
      }

      const token = crypto.randomUUID();

      const { error: inviteError } = await supabase
        .from("organisation_invitations")
        .insert({
          organisation_id: organisationId,
          invited_email: inviteEmail.trim().toLowerCase(),
          invited_by: user.id,
          role_id: inviteRoleId,
          token,
          status: "pending",
        });

      if (inviteError) {
        throw inviteError;
      }

      if (window.addToast) {
        window.addToast("Invitation created successfully!", "success");
      }

      setInviteEmail("");
      setInviteRoleId("");

      await fetchData();
    } catch (err: unknown) {
      console.error("Error sending invitation:", err);

      setError(getErrorMessage(err) || "Failed to create invitation.");
    } finally {
      setInviting(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * CANCEL INVITATION
   * ---------------------------------------------------------
   */

  async function handleCancelInvite(inviteId: string) {
    if (isReadOnly) return;

    setError("");

    try {
      const { error: cancelError } = await supabase
        .from("organisation_invitations")
        .delete()
        .eq("id", inviteId);

      if (cancelError) {
        throw cancelError;
      }

      if (window.addToast) {
        window.addToast("Invitation cancelled.", "info");
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to cancel invitation:", err);

      setError("Failed to cancel invitation.");
    }
  }

  /*
   * ---------------------------------------------------------
   * PROMOTE / DEMOTE MEMBER
   * ---------------------------------------------------------
   */

  async function handleRoleChange(
    member: Member,
    targetRoleCode: "admin" | "member",
  ) {
    if (isReadOnly) return;

    setError("");
    setSuccess("");

    try {
      const targetRole = roles.find((role) => role.code === targetRoleCode);

      if (!targetRole) {
        throw new Error(`Role "${targetRoleCode}" was not found.`);
      }

      const { error: updateError } = await supabase
        .from("organisation_memberships")
        .update({
          role_id: targetRole.id,
        })
        .eq("id", member.id);

      if (updateError) {
        throw updateError;
      }

      if (window.addToast) {
        window.addToast(
          `Role updated successfully to ${targetRole.label}!`,
          "success",
        );
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to change member role:", err);

      setError(getErrorMessage(err) || "Failed to update member role.");
    }
  }

  /*
   * ---------------------------------------------------------
   * DEACTIVATE MEMBER
   * ---------------------------------------------------------
   */

  async function handleDeactivateMember(member: Member) {
    if (isReadOnly) return;

    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("organisation_memberships")
        .update({
          status: "removed",
          removed_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (updateError) {
        throw updateError;
      }

      const { error: personUpdateError } = await supabase
        .from("people")
        .update({
          status: "inactive",
        })
        .eq("organisation_id", organisationId)
        .eq("user_id", member.user_id);

      if (personUpdateError) {
        console.warn("Failed to deactivate person record:", personUpdateError);
      }

      if (window.addToast) {
        window.addToast("Member deactivated successfully.", "success");
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to deactivate member:", err);

      setError(getErrorMessage(err) || "Failed to deactivate member.");
    }
  }

  /*
   * ---------------------------------------------------------
   * REACTIVATE MEMBER
   * ---------------------------------------------------------
   */

  async function handleReactivateMember(member: Member) {
    if (isReadOnly) return;

    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("organisation_memberships")
        .update({
          status: "active",
          removed_at: null,
        })
        .eq("id", member.id);

      if (updateError) {
        throw updateError;
      }

      const { error: personUpdateError } = await supabase
        .from("people")
        .update({
          status: "active",
        })
        .eq("organisation_id", organisationId)
        .eq("user_id", member.user_id);

      if (personUpdateError) {
        console.warn("Failed to reactivate person record:", personUpdateError);
      }

      if (window.addToast) {
        window.addToast("Member reactivated successfully.", "success");
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to reactivate member:", err);

      setError(getErrorMessage(err) || "Failed to reactivate member.");
    }
  }

  /*
   * ---------------------------------------------------------
   * INITIATE OWNERSHIP TRANSFER
   * ---------------------------------------------------------
   */

  async function handleTransferOwnership(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isReadOnly || !transferTargetId) {
      return;
    }

    setError("");
    setSuccess("");
    setTransferring(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Not authenticated.");
      }

      /*
       * Prevent transferring to yourself.
       */

      if (user.id === transferTargetId) {
        throw new Error("You cannot transfer ownership to yourself.");
      }

      /*
       * Only the current owner should be able to initiate
       * the transfer. The database RLS should enforce this too.
       */
      const { error: transferError } = await supabase
        .from("ownership_transfers")
        .insert({
          organisation_id: organisationId,
          from_user_id: user.id,
          to_user_id: transferTargetId,
          status: "pending",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      if (transferError) {
        throw transferError;
      }

      if (window.addToast) {
        window.addToast(
          "Ownership transfer request initiated successfully!",
          "success",
        );
      }

      setTransferTargetId("");

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to initiate ownership transfer:", err);

      setError(
        getErrorMessage(err) || "Failed to initiate ownership transfer.",
      );
    } finally {
      setTransferring(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * CANCEL OUTGOING OWNERSHIP TRANSFER
   * ---------------------------------------------------------
   */

  async function handleCancelTransfer() {
    if (isReadOnly || !pendingOutgoingTransfer) {
      return;
    }

    setError("");

    try {
      const { error: cancelError } = await supabase
        .from("ownership_transfers")
        .update({
          status: "cancelled",
        })
        .eq("id", pendingOutgoingTransfer.id);

      if (cancelError) {
        throw cancelError;
      }

      if (window.addToast) {
        window.addToast("Ownership transfer cancelled.", "info");
      }

      await fetchData();
    } catch (err: unknown) {
      console.error("Failed to cancel ownership transfer:", err);

      setError("Failed to cancel ownership transfer.");
    }
  }

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <MembersTabSkeleton isAdminOrOwner={isAdminOrOwner} userRole={userRole} />
    );
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-8">
      {/* Locked Organisation Banner */}

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
            This organisation is <strong>locked</strong>. All administrative
            operations are disabled.
          </span>
        </div>
      )}

      {/* Error */}

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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0z"
            />
          </svg>

          <span>{error}</span>
        </div>
      )}

      {/* Success */}

      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {/* Member Stats */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-(--surface) p-4 rounded-lg border border-(--border)">
          <p className="text-xs font-semibold text-(--muted) uppercase tracking-wider">
            Active Members
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-(--foreground)">
              {stats.activeCount}
            </span>
          </div>
        </div>

        <div className="bg-(--surface) p-4 rounded-lg border border-(--border)">
          <p className="text-xs font-semibold text-(--muted) uppercase tracking-wider">
            Inactive Members
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-(--foreground)">
              {stats.inactiveCount}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          INCOMING OWNERSHIP TRANSFER
          ===================================================== */}

      {pendingIncomingTransfer && userRole !== "owner" && (
        <section className="bg-(--surface) border border-amber-500/30 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0-4-4m4 4-4 4M16 17H4m0 0 4 4m-4-4 4-4"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-bold text-(--foreground)">
                  Ownership Transfer Pending
                </h3>

                <p className="text-sm text-(--muted) mt-1">
                  {pendingIncomingTransfer.sender?.full_name ||
                    pendingIncomingTransfer.sender?.email ||
                    "The current owner"}{" "}
                  has offered to transfer ownership of this organisation to you.
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full bg-amber-500/10 text-amber-600 px-3 py-1 font-semibold">
                    Pending acceptance
                  </span>

                  <span className="text-(--muted)">
                    Expires{" "}
                    {new Date(
                      pendingIncomingTransfer.expires_at,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAcceptOwnershipTransfer}
              disabled={isReadOnly || acceptingTransfer}
              className="w-full lg:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {acceptingTransfer ? "Accepting..." : "Accept Ownership"}
            </button>
          </div>

          <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              By accepting, you become the new owner of this organisation. The
              current owner&apos;s organisation membership will be removed.
            </p>
          </div>
        </section>
      )}

      {/* =====================================================
          JOIN REQUESTS
          ===================================================== */}

      {isAdminOrOwner && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-(--foreground) flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  joinRequests.length > 0 ? "bg-amber-500" : "bg-(--muted)"
                }`}
              />
              Join Requests
              {joinRequests.length > 0 && <span>({joinRequests.length})</span>}
            </h3>
          </div>

          {joinRequests.length > 0 ? (
            <div className="divide-y divide-(--border)">
              {joinRequests.map((req) => (
                <div
                  key={req.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--foreground) truncate">
                      {req.profiles?.full_name || "Unknown User"}
                    </p>

                    <p className="text-xs text-(--muted) truncate">
                      {req.profiles?.email || req.user_id}
                    </p>

                    <p className="text-[10px] text-(--muted) mt-1">
                      Requested {new Date(req.requested_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(req.id, false)}
                      disabled={isReadOnly}
                      className="px-3 py-1.5 border border-red-500/20 text-red-500 hover:bg-red-500/5 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => handleJoinRequest(req.id, true)}
                      disabled={isReadOnly}
                      className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-(--border) py-8 text-center">
              <p className="text-sm font-medium text-(--foreground)">
                No pending join requests
              </p>

              <p className="text-xs text-(--muted) mt-1">
                New requests will appear here when someone asks to join this
                organisation.
              </p>
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          ACTIVE MEMBERS
          ===================================================== */}

      <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-(--foreground)">
          Active Members ({activeMembers.length})
        </h3>

        {activeMembers.length > 0 ? (
          <div className="divide-y divide-(--border)">
            {activeMembers.map((member) => {
              const profile = member.profiles;
              const role = member.roles;

              const isOwner = role?.code === "owner";

              const isAdmin = role?.code === "admin";

              return (
                <div
                  key={member.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover border border-(--border) shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-(--primary)/10 text-(--primary) flex items-center justify-center font-bold border border-(--border) shrink-0">
                        {profile?.full_name
                          ? profile.full_name.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--foreground) truncate">
                        {profile?.full_name || "Unknown User"}
                      </p>

                      <p className="text-xs text-(--muted) truncate">
                        {profile?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isOwner
                          ? "bg-amber-500/10 text-amber-600"
                          : isAdmin
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-(--border) text-(--muted)"
                      }`}
                    >
                      {role?.label || "Member"}
                    </span>

                    {userRole === "owner" && !isOwner && !isReadOnly && (
                      <div className="flex gap-2">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(member, "member")}
                            className="px-2.5 py-1 text-xs border border-(--border) hover:bg-(--background) text-(--foreground) rounded-lg transition-colors cursor-pointer"
                          >
                            Demote to Member
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRoleChange(member, "admin")}
                            className="px-2.5 py-1 text-xs bg-(--primary) hover:bg-(--primary-dark) text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Promote to Admin
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeactivateMember(member)}
                          className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Deactivate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-(--muted)">
            No active members found.
          </div>
        )}
      </section>

      {/* =====================================================
          INACTIVE MEMBERS
          ===================================================== */}

      {inactiveMembers.length > 0 && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-(--foreground)">
            Inactive Members ({inactiveMembers.length})
          </h3>

          <div className="divide-y divide-(--border)">
            {inactiveMembers.map((member) => {
              const profile = member.profiles;
              const role = member.roles;

              const isOwner = role?.code === "owner";

              const isAdmin = role?.code === "admin";

              return (
                <div
                  key={member.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover border border-(--border) shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-(--primary)/10 text-(--primary) flex items-center justify-center font-bold border border-(--border) shrink-0">
                        {profile?.full_name
                          ? profile.full_name.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-(--foreground) truncate">
                        {profile?.full_name || "Unknown User"}
                      </p>

                      <p className="text-xs text-(--muted) truncate">
                        {profile?.email || "No email"}
                      </p>

                      <p className="text-[10px] text-(--muted) mt-1">
                        Status: {member.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isOwner
                          ? "bg-amber-500/10 text-amber-600"
                          : isAdmin
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-(--border) text-(--muted)"
                      }`}
                    >
                      {role?.label || "Member"}
                    </span>

                    {userRole === "owner" && !isOwner && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleReactivateMember(member)}
                        className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================
          INVITATIONS
          ===================================================== */}

      {isAdminOrOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invite Form */}

          <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-(--foreground)">
              Invite Person
            </h3>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-semibold text-(--foreground)"
                >
                  Email Address
                </label>

                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isReadOnly || inviting}
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-4 py-2 text-sm text-(--foreground) focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 outline-none transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-semibold text-(--foreground)"
                >
                  Role
                </label>

                <select
                  id="invite-role"
                  required
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  disabled={isReadOnly || inviting}
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--primary) outline-none transition-all"
                >
                  <option value="">Select a role</option>

                  {roles
                    .filter((role) => role.code !== "owner")
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                        {role.description ? ` — ${role.description}` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  isReadOnly || inviting || !inviteEmail.trim() || !inviteRoleId
                }
                className="w-full py-2 bg-(--primary) hover:bg-(--primary-dark) disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center"
              >
                {inviting ? "Creating invitation..." : "Create Invitation"}
              </button>
            </form>
          </section>

          {/* Invitations List */}

          <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-(--foreground)">
              Sent Invitations ({invitations.length})
            </h3>

            <div className="divide-y divide-(--border) overflow-y-auto max-h-80">
              {invitations.length > 0 ? (
                invitations.map((inv) => {
                  const inviteLink =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/organisation/accept-invite?token=${inv.token}`
                      : "";

                  return (
                    <div key={inv.id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-(--foreground) truncate">
                            {inv.invited_email}
                          </p>

                          <span className="inline-block rounded bg-(--primary)/10 text-(--primary) text-[10px] px-1.5 py-0.5 font-bold">
                            {inv.roles?.label || "Member"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={isReadOnly}
                          className="text-xs text-red-500 hover:underline cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="bg-(--background) border border-(--border) rounded p-2 text-xs flex justify-between items-center gap-2">
                        <span className="font-mono text-(--muted) truncate flex-1">
                          {inviteLink}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (!inviteLink) return;

                            navigator.clipboard.writeText(inviteLink);

                            if (window.addToast) {
                              window.addToast(
                                "Link copied to clipboard!",
                                "success",
                              );
                            }
                          }}
                          className="text-[10px] font-bold text-(--primary) hover:underline shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-(--muted)">
                  No active invitations pending.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================
          OUTGOING OWNERSHIP TRANSFER — OWNER ONLY
          ===================================================== */}

      {userRole === "owner" && (
        <section className="bg-(--surface) border border-(--border) rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-(--foreground)">
              Transfer Organisation Ownership
            </h3>

            <p className="text-xs text-(--muted) mt-1">
              Initiate transfer of the Owner role to another active member. You
              will lose your membership entirely once they accept.
            </p>
          </div>

          {pendingOutgoingTransfer ? (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-(--foreground)">
                  Pending Transfer Request
                </h4>

                <p className="text-xs text-(--muted) mt-1">
                  Sent to{" "}
                  <span className="font-semibold text-(--foreground)">
                    {pendingOutgoingTransfer.receiver?.email ||
                      pendingOutgoingTransfer.receiver?.full_name ||
                      pendingOutgoingTransfer.to_user_id}
                  </span>
                  .
                </p>

                <div className="mt-3 bg-(--surface) border border-(--border) rounded p-2 text-xs">
                  <span className="text-(--muted)">
                    Expires{" "}
                    {new Date(
                      pendingOutgoingTransfer.expires_at,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelTransfer}
                disabled={isReadOnly}
                className="px-4 py-2 border border-amber-500/30 hover:bg-amber-500/10 text-amber-600 font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Cancel Transfer
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleTransferOwnership}
              className="flex flex-col sm:flex-row items-end gap-3"
            >
              <div className="flex-1 w-full">
                <label
                  htmlFor="transfer-target"
                  className="block text-sm font-semibold text-(--foreground)"
                >
                  Select Target Member
                </label>

                <select
                  id="transfer-target"
                  required
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  disabled={isReadOnly || transferring}
                  className="mt-1 w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--primary) outline-none transition-all"
                >
                  <option value="">Select a member...</option>

                  {activeMembers
                    .filter((member) => member.roles?.code !== "owner")
                    .map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || "Unknown User"} (
                        {member.profiles?.email || "No email"}) -{" "}
                        {member.roles?.label || "Member"}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isReadOnly || transferring || !transferTargetId}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {transferring ? "Initiating..." : "Transfer Ownership"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
