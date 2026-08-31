"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface DuplicateAlert {
  id: string;
  organisation_id: string;
  duplicate_ids: string[];
  email: string;
  status: string;
  resolution_action: string | null;
  created_at: string;
}

interface DuplicatePerson {
  id: string;
  user_id: string | null;
  organisation_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SupabaseLikeError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function DuplicateAlerts({
  organisationId,
}: {
  organisationId: string;
}) {
  const supabase = createClient();

  const [alerts, setAlerts] = useState<DuplicateAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAlert, setSelectedAlert] = useState<DuplicateAlert | null>(
    null,
  );

  const [duplicatePeople, setDuplicatePeople] = useState<DuplicatePerson[]>([]);

  const [selectedPersonId, setSelectedPersonId] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [loadingPeople, setLoadingPeople] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /*
   * Convert Supabase errors into something useful.
   *
   * Supabase/PostgREST errors can sometimes appear as "{}" in the
   * browser console when logged directly.
   */
  const getErrorMessage = useCallback((error: unknown): string => {
    if (!error) {
      return "Unknown error.";
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object") {
      const supabaseError = error as SupabaseLikeError;

      const parts = [
        supabaseError.message,
        supabaseError.details,
        supabaseError.hint,
        supabaseError.code ? `Code: ${supabaseError.code}` : null,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(" — ");
      }

      try {
        return JSON.stringify(error);
      } catch {
        return "An unknown database error occurred.";
      }
    }

    return "An unknown error occurred.";
  }, []);

  /*
   * Load pending duplicate alerts.
   */
  const loadAlerts = useCallback(async () => {
    if (!organisationId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("duplicate_alerts")
        .select(
          `
            id,
            organisation_id,
            duplicate_ids,
            email,
            status,
            resolution_action,
            created_at
          `,
        )
        .eq("organisation_id", organisationId)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const normalizedAlerts: DuplicateAlert[] = (data || []).map((alert) => ({
        id: alert.id,
        organisation_id: alert.organisation_id,
        duplicate_ids: Array.isArray(alert.duplicate_ids)
          ? alert.duplicate_ids.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
        email: alert.email || "",
        status: alert.status || "pending",
        resolution_action: alert.resolution_action ?? null,
        created_at: alert.created_at,
      }));

      setAlerts(normalizedAlerts);
    } catch (error) {
      const message = getErrorMessage(error);

      console.error("Failed to load duplicate alerts:", {
        message,
        error,
      });

      setAlerts([]);

      window.addToast?.(`Failed to load duplicate alerts: ${message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [organisationId, supabase, getErrorMessage]);

  /*
   * Load duplicate people for an alert.
   */
  const viewDuplicates = useCallback(
    async (alert: DuplicateAlert) => {
      setSelectedAlert(alert);
      setSelectedPersonId("");
      setDuplicatePeople([]);
      setShowModal(true);
      setLoadingPeople(true);

      if (alert.duplicate_ids.length === 0) {
        setLoadingPeople(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("people")
          .select(
            `
              id,
              user_id,
              organisation_id,
              first_name,
              last_name,
              email,
              avatar_url,
              created_at
            `,
          )
          .eq("organisation_id", organisationId)
          .in("id", alert.duplicate_ids)
          .order("created_at", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setDuplicatePeople(data || []);
      } catch (error) {
        const message = getErrorMessage(error);

        console.error("Failed to load duplicate people:", {
          message,
          error,
          alertId: alert.id,
        });

        setDuplicatePeople([]);

        window.addToast?.(
          `Failed to load duplicate profiles: ${message}`,
          "error",
        );
      } finally {
        setLoadingPeople(false);
      }
    },
    [organisationId, supabase, getErrorMessage],
  );

  /*
   * Close duplicate modal.
   */
  function closeModal() {
    if (actionLoading) {
      return;
    }

    setShowModal(false);
    setSelectedAlert(null);
    setDuplicatePeople([]);
    setSelectedPersonId("");
  }

  /*
   * Resolve duplicate alert.
   *
   * IMPORTANT:
   * selectedPersonId always means:
   *
   * "The record the administrator wants to KEEP."
   *
   * For delete_one, every other duplicate is deleted.
   */
  const resolveAlert = useCallback(
    async (
      alert: DuplicateAlert,
      action: "merge" | "keep_both" | "delete_one",
    ) => {
      if (action !== "keep_both" && !selectedPersonId) {
        window.addToast?.(
          "Select the person record you want to keep first.",
          "warning",
        );
        return;
      }

      setActionLoading(true);

      try {
        const currentUserResult = await supabase.auth.getUser();

        if (currentUserResult.error) {
          throw currentUserResult.error;
        }

        const currentUserId = currentUserResult.data.user?.id ?? null;

        /*
         * Keep both requires no person deletion or merge.
         */
        if (action === "keep_both") {
          const { error } = await supabase
            .from("duplicate_alerts")
            .update({
              status: "resolved",
              resolution_action: "keep_both",
              resolved_by: currentUserId,
              resolved_at: new Date().toISOString(),
            })
            .eq("id", alert.id)
            .eq("organisation_id", organisationId);

          if (error) {
            throw error;
          }

          window.addToast?.(
            "Duplicate alert marked as resolved. Both records were kept.",
            "success",
          );
        } else {
          const keepPersonId = selectedPersonId;

          const otherIds = duplicatePeople
            .filter((person) => person.id !== keepPersonId)
            .map((person) => person.id);

          if (otherIds.length === 0) {
            throw new Error(
              "There is no other duplicate record available for this action.",
            );
          }

          /*
           * MERGE
           *
           * Move related records from duplicate people to the
           * selected person, then delete the duplicate people.
           */
          if (action === "merge") {
            for (const duplicateId of otherIds) {
              /*
               * Group memberships.
               */
              const { error: groupMembershipError } = await supabase
                .from("group_memberships")
                .update({
                  person_id: keepPersonId,
                })
                .eq("person_id", duplicateId);

              if (groupMembershipError) {
                throw new Error(
                  `Failed to transfer group memberships: ${getErrorMessage(
                    groupMembershipError,
                  )}`,
                );
              }

              /*
               * Attendance records.
               */
              const { error: attendanceError } = await supabase
                .from("attendance_records")
                .update({
                  person_id: keepPersonId,
                })
                .eq("person_id", duplicateId);

              if (attendanceError) {
                throw new Error(
                  `Failed to transfer attendance records: ${getErrorMessage(
                    attendanceError,
                  )}`,
                );
              }

              /*
               * Delete duplicate person.
               */
              const { error: deletePersonError } = await supabase
                .from("people")
                .delete()
                .eq("id", duplicateId)
                .eq("organisation_id", organisationId);

              if (deletePersonError) {
                throw new Error(
                  `Failed to delete duplicate person: ${getErrorMessage(
                    deletePersonError,
                  )}`,
                );
              }
            }

            /*
             * Resolve the alert only after the merge succeeds.
             */
            const { error: resolveError } = await supabase
              .from("duplicate_alerts")
              .update({
                status: "resolved",
                resolution_action: "merge",
                resolved_by: currentUserId,
                resolved_at: new Date().toISOString(),
              })
              .eq("id", alert.id)
              .eq("organisation_id", organisationId);

            if (resolveError) {
              throw resolveError;
            }

            window.addToast?.(
              "Duplicate records merged successfully.",
              "success",
            );
          }

          /*
           * DELETE ONE
           *
           * selectedPersonId is the person to KEEP.
           * Therefore the other duplicate record(s) are deleted.
           */
          if (action === "delete_one") {
            for (const duplicateId of otherIds) {
              const { error: deleteError } = await supabase
                .from("people")
                .delete()
                .eq("id", duplicateId)
                .eq("organisation_id", organisationId);

              if (deleteError) {
                throw new Error(
                  `Failed to delete duplicate person: ${getErrorMessage(
                    deleteError,
                  )}`,
                );
              }
            }

            const { error: resolveError } = await supabase
              .from("duplicate_alerts")
              .update({
                status: "resolved",
                resolution_action: "delete_one",
                resolved_by: currentUserId,
                resolved_at: new Date().toISOString(),
              })
              .eq("id", alert.id)
              .eq("organisation_id", organisationId);

            if (resolveError) {
              throw resolveError;
            }

            window.addToast?.(
              "Duplicate record removed successfully.",
              "success",
            );
          }
        }

        closeModal();
        await loadAlerts();
      } catch (error) {
        const message = getErrorMessage(error);

        console.error("Failed to resolve duplicate alert:", {
          message,
          error,
          alertId: alert.id,
          action,
          selectedPersonId,
        });

        window.addToast?.(
          `Failed to resolve duplicate alert: ${message}`,
          "error",
        );
      } finally {
        setActionLoading(false);
      }
    },
    [
      selectedPersonId,
      supabase,
      closeModal,
      loadAlerts,
      organisationId,
      duplicatePeople,
      getErrorMessage,
    ],
  );

  /*
   * Ignore duplicate alert.
   */
  const ignoreAlert = useCallback(
    async (alertId: string) => {
      setActionLoading(true);

      try {
        const { error } = await supabase
          .from("duplicate_alerts")
          .update({
            status: "ignored",
            resolution_action: "ignored",
          })
          .eq("id", alertId)
          .eq("organisation_id", organisationId);

        if (error) {
          throw error;
        }

        window.addToast?.("Duplicate alert ignored.", "success");

        await loadAlerts();
      } catch (error) {
        const message = getErrorMessage(error);

        console.error("Failed to ignore duplicate alert:", {
          message,
          error,
          alertId,
        });

        window.addToast?.(
          `Failed to ignore duplicate alert: ${message}`,
          "error",
        );
      } finally {
        setActionLoading(false);
      }
    },
    [organisationId, supabase, getErrorMessage, loadAlerts],
  );

  /*
   * Load alerts when the organisation changes.
   *
   * The effect itself only triggers the async operation.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!organisationId) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      if (cancelled) {
        return;
      }

      await loadAlerts();
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [organisationId, loadAlerts]);

  if (loading) {
    return <div className="text-(--muted)">Loading alerts...</div>;
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Duplicate Alerts */}
      <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h3 className="font-semibold text-amber-900">
              Duplicate User Alerts ({alerts.length})
            </h3>

            <p className="text-sm text-amber-700">
              Potential duplicate profiles detected. Review and resolve.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-white/50 p-3"
            >
              <div>
                <p className="font-medium text-amber-900">
                  {alert.email || "Potential duplicate profiles"}
                </p>

                <p className="text-xs text-amber-700">
                  {alert.duplicate_ids.length} duplicate
                  {alert.duplicate_ids.length === 1 ? "" : "s"} detected
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => viewDuplicates(alert)}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void ignoreAlert(alert.id)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duplicate Review Modal */}
      {showModal && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-(--surface) p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-(--foreground)">
                Resolve Duplicate: {selectedAlert.email || "Duplicate Profiles"}
              </h2>

              <button
                type="button"
                disabled={actionLoading}
                onClick={closeModal}
                className="text-(--muted) hover:text-(--foreground) disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* People */}
            <div className="mb-6 space-y-4">
              {loadingPeople ? (
                <div className="rounded-lg border border-(--border) p-8 text-center text-sm text-(--muted)">
                  Loading duplicate profiles...
                </div>
              ) : duplicatePeople.length === 0 ? (
                <div className="rounded-lg border border-(--border) p-8 text-center text-sm text-(--muted)">
                  No duplicate profiles could be found.
                </div>
              ) : (
                duplicatePeople.map((person) => (
                  <label
                    key={person.id}
                    className={`block cursor-pointer rounded-lg border p-4 transition-colors ${
                      selectedPersonId === person.id
                        ? "border-(--primary) bg-(--primary)/10"
                        : "border-(--border) bg-(--background)"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {person.avatar_url ? (
                        <img
                          src={person.avatar_url}
                          alt={`${person.first_name} ${person.last_name || ""}`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--primary)/20">
                          <span className="font-semibold text-(--primary)">
                            {person.first_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}

                      <div className="flex-1">
                        <p className="font-semibold text-(--foreground)">
                          {person.first_name} {person.last_name || ""}
                        </p>

                        <p className="text-sm text-(--muted)">
                          {person.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-(--muted)">
                          Created:{" "}
                          {new Date(person.created_at).toLocaleDateString()}
                        </p>

                        {person.user_id && (
                          <span className="mt-2 inline-block rounded bg-(--primary)/10 px-2 py-1 text-xs text-(--primary)">
                            Linked User
                          </span>
                        )}
                      </div>

                      <input
                        type="radio"
                        name={`keepPerson-${selectedAlert.id}`}
                        value={person.id}
                        checked={selectedPersonId === person.id}
                        onChange={(event) =>
                          setSelectedPersonId(event.target.value)
                        }
                        disabled={actionLoading}
                        className="h-5 w-5 accent-(--primary)"
                      />
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-(--foreground)">
                  Select the record you want to keep.
                </p>

                <p className="mt-1 text-xs text-(--muted)">
                  Merge transfers related records before removing duplicates.
                  Delete removes the other duplicate records while keeping your
                  selected record.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    loadingPeople ||
                    !selectedPersonId ||
                    duplicatePeople.length < 2
                  }
                  onClick={() => void resolveAlert(selectedAlert, "merge")}
                  className="rounded-lg bg-(--primary) px-4 py-2 font-medium text-white transition-colors hover:bg-(--primary-dark) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Merge Records"}
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading ||
                    loadingPeople ||
                    !selectedPersonId ||
                    duplicatePeople.length < 2
                  }
                  onClick={() => void resolveAlert(selectedAlert, "delete_one")}
                  className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Duplicate
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void resolveAlert(selectedAlert, "keep_both")}
                  className="rounded-lg border border-(--border) px-4 py-2 font-medium text-(--foreground) transition-colors hover:bg-(--primary)/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep Both
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
