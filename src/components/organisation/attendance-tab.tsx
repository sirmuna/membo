"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-(--border) ${className}`} />;
}

function AttendanceTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-64" />
        </div>

        <SkeletonLine className="h-10 w-32 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface) shadow-sm">
        <div className="border-b border-(--border) p-4">
          <SkeletonLine className="h-5 w-32" />
        </div>

        <div className="divide-y divide-(--border)">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-40" />
                <SkeletonLine className="h-3 w-24" />
              </div>

              <div className="flex gap-2">
                <SkeletonLine className="h-8 w-20 rounded-lg" />
                <SkeletonLine className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceType = "individual" | "count";

interface AttendanceSchedule {
  id: string;
  name: string;
  organisation_id: string;
  group_id: string | null;
}

interface AttendanceSession {
  id: string;
  schedule_id: string | null;
  organisation_id: string;
  session_date: string;
  status: "open" | "closed";
  group_id: string | null;
  closed_at: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  attendance_type: AttendanceType;
  schedule?: AttendanceSchedule;
  group?: {
    name: string;
  };
  stats?: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  };
}

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface AttendanceRecord {
  person_id: string;
  status: AttendanceStatus;
}

interface AttendanceCountCategory {
  id: string;
  session_id: string;
  name: string;
  count: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface AttendanceTabProps {
  organisationId: string;
  userRole?: string;
}

type SessionRecordMap = Record<string, AttendanceStatus>;

interface DraftCountCategory {
  id: string;
  name: string;
  count: number;
}

export function AttendanceTab({
  organisationId,
  userRole,
}: AttendanceTabProps) {
  const supabase = useMemo(() => createClient(), []);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------
  // New Session Modal
  // ------------------------------------------------------------
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedAttendanceType, setSelectedAttendanceType] =
    useState<AttendanceType>("individual");
  const [submitting, setSubmitting] = useState(false);

  // ------------------------------------------------------------
  // Individual Attendance Modal
  // ------------------------------------------------------------
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null,
  );

  const [sessionPeople, setSessionPeople] = useState<Person[]>([]);
  const [sessionRecords, setSessionRecords] = useState<SessionRecordMap>({});
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingRecords, setSavingRecords] = useState(false);

  // ------------------------------------------------------------
  // Custom / Count Attendance
  // ------------------------------------------------------------
  const [countCategories, setCountCategories] = useState<
    AttendanceCountCategory[]
  >([]);

  const [draftCountCategories, setDraftCountCategories] = useState<
    DraftCountCategory[]
  >([]);

  /*
   * The application model allows:
   *
   * owner
   * manager
   * admin
   * group_leader
   *
   * to manage attendance according to their organisation/group scope.
   *
   * IMPORTANT:
   * Supabase RLS remains the final authority.
   * The current database policies supplied earlier only allow owner/admin,
   * so those policies must be expanded separately for manager/group_leader.
   */
  const canManageAttendance =
    !userRole ||
    ["owner", "manager", "admin", "group_leader"].includes(
      userRole.toLowerCase(),
    );

  const isOwnerOrAdmin =
    !userRole || ["owner", "admin"].includes(userRole.toLowerCase());

  const notify = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" | "warning" = "info",
    ) => {
      if (typeof window !== "undefined" && window.addToast) {
        window.addToast(message, type);
      }
    },
    [],
  );

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      // ----------------------------------------------------------
      // 1. Groups
      // ----------------------------------------------------------
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .is("archived_at", null)
        .order("name", { ascending: true });

      if (groupsError) {
        throw groupsError;
      }

      setGroups(groupsData ?? []);

      // ----------------------------------------------------------
      // 2. Active people
      // ----------------------------------------------------------
      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select("id, first_name, last_name, email")
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .order("first_name", { ascending: true });

      if (peopleError) {
        throw peopleError;
      }

      setPeople(peopleData ?? []);

      // ----------------------------------------------------------
      // 3. Attendance sessions
      // ----------------------------------------------------------
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("attendance_sessions")
        .select(
          `
          id,
          schedule_id,
          organisation_id,
          group_id,
          session_date,
          opens_at,
          closes_at,
          closed_at,
          status,
          attendance_type,
          created_at,
          group:group_id (
            name
          )
        `,
        )
        .eq("organisation_id", organisationId)
        .order("session_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        return;
      }

      // ----------------------------------------------------------
      // 4. Fetch schedules
      // ----------------------------------------------------------
      const scheduleIds = Array.from(
        new Set(
          sessionsData.map((session) => session.schedule_id).filter(Boolean),
        ),
      );

      const schedulesMap = new Map<string, AttendanceSchedule>();

      if (scheduleIds.length > 0) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("attendance_schedules")
          .select("id, name, organisation_id, group_id")
          .in("id", scheduleIds)
          .eq("organisation_id", organisationId);

        if (schedulesError) {
          throw schedulesError;
        }

        (schedulesData ?? []).forEach((schedule) => {
          schedulesMap.set(schedule.id, schedule);
        });
      }

      // ----------------------------------------------------------
      // 5. Fetch individual attendance records
      // ----------------------------------------------------------
      const individualSessionIds = sessionsData
        .filter(
          (session) =>
            (session.attendance_type ?? "individual") === "individual",
        )
        .map((session) => session.id);

      const recordsBySession = new Map<string, AttendanceRecord[]>();

      if (individualSessionIds.length > 0) {
        const { data: recordsData, error: recordsError } = await supabase
          .from("attendance_records")
          .select("session_id, person_id, status")
          .in("session_id", individualSessionIds);

        if (recordsError) {
          throw recordsError;
        }

        (recordsData ?? []).forEach((record) => {
          const current = recordsBySession.get(record.session_id) ?? [];

          current.push({
            person_id: record.person_id,
            status: record.status as AttendanceStatus,
          });

          recordsBySession.set(record.session_id, current);
        });
      }

      // ----------------------------------------------------------
      // 6. Fetch count categories
      // ----------------------------------------------------------
      const countSessionIds = sessionsData
        .filter((session) => session.attendance_type === "count")
        .map((session) => session.id);

      const categoriesBySession = new Map<string, AttendanceCountCategory[]>();

      if (countSessionIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("attendance_count_categories")
          .select(
            "id, session_id, name, count, sort_order, created_at, updated_at",
          )
          .in("session_id", countSessionIds)
          .order("sort_order", { ascending: true });

        if (categoriesError) {
          throw categoriesError;
        }

        (categoriesData ?? []).forEach((category) => {
          const current = categoriesBySession.get(category.session_id) ?? [];

          current.push(category as AttendanceCountCategory);

          categoriesBySession.set(category.session_id, current);
        });
      }

      // ----------------------------------------------------------
      // 7. Build sessions
      // ----------------------------------------------------------
      const enhancedSessions: AttendanceSession[] = sessionsData.map(
        (session) => {
          const attendanceType: AttendanceType =
            session.attendance_type === "count" ? "count" : "individual";

          const schedule = session.schedule_id
            ? schedulesMap.get(session.schedule_id)
            : undefined;

          const group =
            Array.isArray(session.group) && session.group[0]
              ? { name: String(session.group[0].name) }
              : session.group
                ? {
                    name: String((session.group as { name: string }).name),
                  }
                : undefined;

          if (attendanceType === "count") {
            const categories = categoriesBySession.get(session.id) ?? [];

            const total = categories.reduce(
              (sum, category) => sum + Number(category.count || 0),
              0,
            );

            return {
              id: session.id,
              schedule_id: session.schedule_id,
              organisation_id: session.organisation_id,
              session_date: session.session_date,
              status: session.status as "open" | "closed",
              group_id: session.group_id,
              closed_at: session.closed_at,
              opens_at: session.opens_at,
              closes_at: session.closes_at,
              attendance_type: "count",
              schedule,
              group,
              stats: {
                total,
                present: total,
                absent: 0,
                late: 0,
                excused: 0,
                rate: total > 0 ? 100 : 0,
              },
            };
          }

          const records = recordsBySession.get(session.id) ?? [];

          const total = records.length;

          const present = records.filter(
            (record) => record.status === "present",
          ).length;

          const absent = records.filter(
            (record) => record.status === "absent",
          ).length;

          const late = records.filter(
            (record) => record.status === "late",
          ).length;

          const excused = records.filter(
            (record) => record.status === "excused",
          ).length;

          const rate =
            total > 0 ? Math.round(((present + late) / total) * 100) : 0;

          return {
            id: session.id,
            schedule_id: session.schedule_id,
            organisation_id: session.organisation_id,
            session_date: session.session_date,
            status: session.status as "open" | "closed",
            group_id: session.group_id,
            closed_at: session.closed_at,
            opens_at: session.opens_at,
            closes_at: session.closes_at,
            attendance_type: "individual",
            schedule,
            group,
            stats: {
              total,
              present,
              absent,
              late,
              excused,
              rate,
            },
          };
        },
      );

      setSessions(enhancedSessions);
    } catch (error) {
      console.error("Error fetching attendance data:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to load attendance data.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [organisationId, notify, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ============================================================
  // PEOPLE SCOPE
  // ============================================================

  const fetchPeopleForSession = useCallback(
    async (session: AttendanceSession) => {
      if (!session.group_id) {
        return people;
      }

      const { data: memberships, error } = await supabase
        .from("group_memberships")
        .select("person_id")
        .eq("group_id", session.group_id);

      if (error) {
        throw error;
      }

      const memberIds = new Set(
        (memberships ?? []).map((membership) => membership.person_id),
      );

      return people.filter((person) => memberIds.has(person.id));
    },
    [people, supabase],
  );

  // ============================================================
  // CREATE SESSION
  // ============================================================

  async function handleCreateSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canManageAttendance) {
      notify("You do not have permission to manage attendance.", "error");
      return;
    }

    const title = sessionTitle.trim();

    if (!title) {
      notify("Session title is required.", "error");
      return;
    }

    if (!sessionDate) {
      notify("Session date is required.", "error");
      return;
    }

    setSubmitting(true);

    try {
      // ----------------------------------------------------------
      // 1. Create schedule
      // ----------------------------------------------------------
      const { data: schedule, error: scheduleError } = await supabase
        .from("attendance_schedules")
        .insert({
          organisation_id: organisationId,
          group_id: selectedGroupId || null,
          name: title,
          recurrence_rule: null,
        })
        .select("id, name, organisation_id, group_id")
        .single();

      if (scheduleError) {
        throw scheduleError;
      }

      if (!schedule) {
        throw new Error("Attendance schedule was not created.");
      }

      // ----------------------------------------------------------
      // 2. Create session
      // ----------------------------------------------------------
      const { data: newSession, error: sessionError } = await supabase
        .from("attendance_sessions")
        .insert({
          schedule_id: schedule.id,
          organisation_id: organisationId,
          group_id: selectedGroupId || null,
          session_date: sessionDate,
          status: "open",
          attendance_type: selectedAttendanceType,
        })
        .select(
          `
            id,
            schedule_id,
            organisation_id,
            group_id,
            session_date,
            opens_at,
            closes_at,
            closed_at,
            status,
            attendance_type
          `,
        )
        .single();

      if (sessionError) {
        const { error: cleanupError } = await supabase
          .from("attendance_schedules")
          .delete()
          .eq("id", schedule.id);

        if (cleanupError) {
          console.error(
            "Failed to clean up orphan attendance schedule:",
            cleanupError,
          );
        }

        throw sessionError;
      }

      if (!newSession) {
        throw new Error("Attendance session was not created.");
      }

      const selectedGroup = selectedGroupId
        ? groups.find((group) => group.id === selectedGroupId)
        : undefined;

      const uiSession: AttendanceSession = {
        id: newSession.id,
        schedule_id: newSession.schedule_id,
        organisation_id: newSession.organisation_id,
        session_date: newSession.session_date,
        status: newSession.status as "open" | "closed",
        group_id: newSession.group_id,
        closed_at: newSession.closed_at,
        opens_at: newSession.opens_at,
        closes_at: newSession.closes_at,
        attendance_type:
          newSession.attendance_type === "count" ? "count" : "individual",
        schedule: {
          id: schedule.id,
          name: schedule.name,
          organisation_id: schedule.organisation_id,
          group_id: schedule.group_id,
        },
        group: selectedGroup
          ? {
              name: selectedGroup.name,
            }
          : undefined,
      };

      notify(
        selectedAttendanceType === "count"
          ? "Custom attendance session created."
          : "Attendance session created.",
        "success",
      );

      setShowSessionModal(false);
      setSessionTitle("");
      setSelectedGroupId("");
      setSelectedAttendanceType("individual");
      setSessionDate(new Date().toISOString().slice(0, 10));

      await fetchData();

      // Open appropriate attendance interface.
      await handleOpenAttendanceModal(uiSession);
    } catch (error) {
      console.error("Error creating attendance session:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to create attendance session.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // OPEN ATTENDANCE MODAL
  // ============================================================

  async function handleOpenAttendanceModal(session: AttendanceSession) {
    setActiveSession(session);
    setShowMarkModal(true);
    setLoadingRecords(true);
    setSessionRecords({});
    setCountCategories([]);
    setDraftCountCategories([]);

    try {
      if (session.attendance_type === "count") {
        const { data: categories, error } = await supabase
          .from("attendance_count_categories")
          .select(
            "id, session_id, name, count, sort_order, created_at, updated_at",
          )
          .eq("session_id", session.id)
          .order("sort_order", { ascending: true });

        if (error) {
          throw error;
        }

        const normalized = (categories ?? []) as AttendanceCountCategory[];

        setCountCategories(normalized);

        setDraftCountCategories(
          normalized.map((category) => ({
            id: category.id,
            name: category.name,
            count: Number(category.count || 0),
          })),
        );

        return;
      }

      // ----------------------------------------------------------
      // Individual attendance
      // ----------------------------------------------------------
      const scopedPeople = await fetchPeopleForSession(session);

      setSessionPeople(scopedPeople);

      const { data: existingRecords, error } = await supabase
        .from("attendance_records")
        .select("person_id, status")
        .eq("session_id", session.id);

      if (error) {
        throw error;
      }

      const recordMap: SessionRecordMap = {};

      (existingRecords ?? []).forEach((record) => {
        recordMap[record.person_id] = record.status as AttendanceStatus;
      });

      setSessionRecords(recordMap);
    } catch (error) {
      console.error("Error loading attendance records:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to load attendance records.",
        "error",
      );
    } finally {
      setLoadingRecords(false);
    }
  }

  // ============================================================
  // INDIVIDUAL ATTENDANCE
  // ============================================================

  function handleSetPersonStatus(personId: string, status: AttendanceStatus) {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    setSessionRecords((previous) => ({
      ...previous,
      [personId]: status,
    }));
  }

  function handleBulkMark(status: "present" | "absent") {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    const updated: SessionRecordMap = {};

    sessionPeople.forEach((person) => {
      updated[person.id] = status;
    });

    setSessionRecords(updated);
  }

  async function handleSaveIndividualAttendance() {
    if (!activeSession) {
      return;
    }

    if (activeSession.status === "closed") {
      notify("Closed sessions cannot be modified.", "error");
      return;
    }

    setSavingRecords(true);

    try {
      const recordsToUpsert = Object.entries(sessionRecords).map(
        ([person_id, status]) => ({
          session_id: activeSession.id,
          person_id,
          status,
        }),
      );

      if (recordsToUpsert.length === 0) {
        notify("No attendance records have been marked.", "warning");
        return;
      }

      const { error } = await supabase
        .from("attendance_records")
        .upsert(recordsToUpsert, {
          onConflict: "session_id,person_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("Supabase attendance upsert error:", error);

        throw new Error(error.message || "Failed to save attendance records.");
      }

      notify("Attendance records saved.", "success");

      closeAttendanceModalState();

      await fetchData();
    } catch (error) {
      console.error("Error saving attendance records:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to save attendance records.",
        "error",
      );
    } finally {
      setSavingRecords(false);
    }
  }

  // ============================================================
  // COUNT ATTENDANCE
  // ============================================================

  function handleAddCountCategory() {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    setDraftCountCategories((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: "",
        count: 0,
      },
    ]);
  }

  function handleUpdateCountCategory(
    id: string,
    field: "name" | "count",
    value: string,
  ) {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    setDraftCountCategories((previous) =>
      previous.map((category) => {
        if (category.id !== id) {
          return category;
        }

        if (field === "name") {
          return {
            ...category,
            name: value,
          };
        }

        const parsed = Number.parseInt(value, 10);

        return {
          ...category,
          count: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
        };
      }),
    );
  }

  function handleRemoveCountCategory(id: string) {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    setDraftCountCategories((previous) =>
      previous.filter((category) => category.id !== id),
    );
  }

  function handleMoveCountCategory(id: string, direction: "up" | "down") {
    if (!activeSession || activeSession.status === "closed") {
      return;
    }

    setDraftCountCategories((previous) => {
      const index = previous.findIndex((category) => category.id === id);

      if (index === -1) {
        return previous;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const updated = [...previous];

      const [item] = updated.splice(index, 1);

      updated.splice(targetIndex, 0, item);

      return updated;
    });
  }

  async function handleSaveCountAttendance() {
    if (!activeSession) {
      return;
    }

    if (activeSession.status === "closed") {
      notify("Closed sessions cannot be modified.", "error");
      return;
    }

    setSavingRecords(true);

    try {
      const cleanedCategories = draftCountCategories
        .map((category) => ({
          name: category.name.trim(),
          count: Math.max(
            0,
            Number.isFinite(category.count) ? category.count : 0,
          ),
        }))
        .filter((category) => category.name.length > 0);

      const duplicateNames = new Set<string>();

      for (const category of cleanedCategories) {
        const normalizedName = category.name.toLowerCase();

        if (duplicateNames.has(normalizedName)) {
          throw new Error(`Duplicate attendance category: "${category.name}".`);
        }

        duplicateNames.add(normalizedName);
      }

      /*
       * Categories are session-specific.
       *
       * There is intentionally no global category definition.
       *
       * Because the current schema does not expose a unique
       * constraint for (session_id, name), we replace the
       * session's category rows atomically from the application's
       * perspective:
       *
       * 1. Delete existing categories.
       * 2. Insert the current category list.
       *
       * If you want true database-level atomicity, this should
       * eventually move into an RPC.
       */
      const { error: deleteError } = await supabase
        .from("attendance_count_categories")
        .delete()
        .eq("session_id", activeSession.id);

      if (deleteError) {
        throw deleteError;
      }

      if (cleanedCategories.length > 0) {
        const rows = cleanedCategories.map((category, index) => ({
          session_id: activeSession.id,
          name: category.name,
          count: category.count,
          sort_order: index,
        }));

        const { error: insertError } = await supabase
          .from("attendance_count_categories")
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      notify("Custom attendance counts saved.", "success");

      closeAttendanceModalState();

      await fetchData();
    } catch (error) {
      console.error("Error saving custom attendance:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to save custom attendance.",
        "error",
      );
    } finally {
      setSavingRecords(false);
    }
  }

  // ============================================================
  // CLOSE SESSION
  // ============================================================

  async function handleCloseSession(session: AttendanceSession) {
    if (!canManageAttendance) {
      notify("You do not have permission to manage attendance.", "error");
      return;
    }

    if (session.status === "closed") {
      return;
    }

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            session.attendance_type === "count"
              ? "Close this custom attendance session?"
              : "Close this attendance session? Any unmarked person will be recorded as absent.",
          )
        : true;

    if (!confirmed) {
      return;
    }

    try {
      // ----------------------------------------------------------
      // Count sessions don't create absent records.
      // Their categories are already the complete attendance data.
      // ----------------------------------------------------------
      if (session.attendance_type === "count") {
        const { error: closeCountError } = await supabase
          .from("attendance_sessions")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
          })
          .eq("id", session.id)
          .eq("organisation_id", organisationId);

        if (closeCountError) {
          throw closeCountError;
        }

        notify("Custom attendance session closed.", "info");

        await fetchData();

        return;
      }

      // ----------------------------------------------------------
      // Individual session
      // ----------------------------------------------------------
      const scopedPeople = await fetchPeopleForSession(session);

      const { data: existingRecords, error: recordsError } = await supabase
        .from("attendance_records")
        .select("person_id")
        .eq("session_id", session.id);

      if (recordsError) {
        throw recordsError;
      }

      const markedPersonIds = new Set(
        (existingRecords ?? []).map((record) => record.person_id),
      );

      const unmarkedPeople = scopedPeople.filter(
        (person) => !markedPersonIds.has(person.id),
      );

      if (unmarkedPeople.length > 0) {
        const absentRecords = unmarkedPeople.map((person) => ({
          session_id: session.id,
          person_id: person.id,
          status: "absent" as const,
          is_default_absent: true,
          marked_by: null,
        }));

        const { error: absentError } = await supabase
          .from("attendance_records")
          .upsert(absentRecords, {
            onConflict: "session_id,person_id",
          });

        if (absentError) {
          throw absentError;
        }
      }

      const { error: closeError } = await supabase
        .from("attendance_sessions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .eq("organisation_id", organisationId);

      if (closeError) {
        throw closeError;
      }

      notify("Session closed. Unmarked people were set to Absent.", "info");

      await fetchData();
    } catch (error) {
      console.error("Error closing attendance session:", error);

      notify(
        error instanceof Error
          ? error.message
          : "Failed to close attendance session.",
        "error",
      );
    }
  }

  // ============================================================
  // MODAL STATE
  // ============================================================

  function closeAttendanceModalState() {
    setShowMarkModal(false);
    setActiveSession(null);
    setSessionRecords({});
    setSessionPeople([]);
    setCountCategories([]);
    setDraftCountCategories([]);
  }

  function handleCloseMarkModal() {
    if (savingRecords) {
      return;
    }

    closeAttendanceModalState();
  }

  const markedCount = Object.keys(sessionRecords).length;

  const totalCountAttendance = draftCountCategories.reduce(
    (sum, category) => sum + Math.max(0, category.count),
    0,
  );

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return <AttendanceTabSkeleton />;
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ========================================================
          HEADER
      ======================================================== */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-(--foreground)">
            Attendance Management
          </h2>

          <p className="text-xs text-(--muted)">
            Track individual attendance or record session-specific attendance
            counts.
          </p>
        </div>

        {canManageAttendance && (
          <button
            type="button"
            onClick={() => setShowSessionModal(true)}
            className="self-start rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--primary-dark) sm:self-auto"
          >
            + New Attendance Session
          </button>
        )}
      </div>

      {/* ========================================================
          SESSIONS TABLE
      ======================================================== */}
      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface) shadow-sm">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-(--muted)">
            No attendance sessions created yet. Click &quot;+ New Attendance
            Session&quot; to record attendance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-(--foreground)">
              <thead className="border-b border-(--border) bg-(--background) text-xs font-semibold uppercase text-(--muted)">
                <tr>
                  <th className="px-6 py-3">Session Title</th>

                  <th className="px-6 py-3">Type</th>

                  <th className="px-6 py-3">Date</th>

                  <th className="px-6 py-3">Scope</th>

                  <th className="px-6 py-3">Attendance</th>

                  <th className="px-6 py-3">Status</th>

                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-(--border)">
                {sessions.map((session) => {
                  const rate = session.stats?.rate ?? 0;

                  const present = session.stats?.present ?? 0;

                  const total = session.stats?.total ?? 0;

                  const isCount = session.attendance_type === "count";

                  return (
                    <tr
                      key={session.id}
                      className="transition-colors hover:bg-(--background)/50"
                    >
                      <td className="px-6 py-4 font-semibold text-(--foreground)">
                        {session.schedule?.name || "Untitled Session"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isCount
                              ? "bg-(--warning)/10 text-(--warning)"
                              : "bg-(--primary)/10 text-(--primary)"
                          }`}
                        >
                          {isCount ? "COUNT" : "INDIVIDUAL"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-(--muted)">
                        {new Date(session.session_date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <span className="rounded-full border border-(--border) bg-(--background) px-2.5 py-0.5 font-medium text-(--foreground)">
                          {session.group?.name || "Entire Organisation"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {isCount ? (
                          <span className="text-xs font-semibold text-(--foreground)">
                            {total.toLocaleString()} counted
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-(--border)">
                              <div
                                className="h-2 rounded-full bg-(--success)"
                                style={{
                                  width: `${Math.min(Math.max(rate, 0), 100)}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs font-semibold text-(--foreground)">
                              {rate}% ({present}/{total})
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            session.status === "open"
                              ? "bg-(--success)/10 text-(--success)"
                              : "bg-(--muted)/10 text-(--muted)"
                          }`}
                        >
                          {session.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenAttendanceModal(session)
                            }
                            className="text-xs font-semibold text-(--primary) hover:underline"
                          >
                            {session.status === "open"
                              ? isCount
                                ? "Edit Counts"
                                : "Mark Attendance"
                              : "View Records"}
                          </button>

                          {session.status === "open" && canManageAttendance && (
                            <button
                              type="button"
                              onClick={() => void handleCloseSession(session)}
                              className="text-xs font-semibold text-(--muted) hover:text-(--foreground)"
                            >
                              Close Session
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          NEW SESSION MODAL
      ======================================================== */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-(--foreground)">
                  Create Attendance Session
                </h2>

                <p className="mt-1 text-xs text-(--muted)">
                  Choose individual attendance or session-specific attendance
                  counts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="text-lg text-(--muted) hover:text-(--foreground)"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Session Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-(--muted)">
                  Session Title *
                </label>

                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Sunday Service, Youth Meeting"
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                />
              </div>

              {/* Session Date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-(--muted)">
                  Session Date *
                </label>

                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                />
              </div>

              {/* Attendance Type */}
              <div>
                <label className="mb-2 block text-xs font-medium text-(--muted)">
                  Attendance Type *
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAttendanceType("individual")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedAttendanceType === "individual"
                        ? "border-(--primary) bg-(--primary)/10"
                        : "border-(--border) bg-(--background)"
                    }`}
                  >
                    <p className="text-sm font-semibold text-(--foreground)">
                      Individual
                    </p>

                    <p className="mt-1 text-xs text-(--muted)">
                      Mark each person Present, Absent, Late or Excused.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAttendanceType("count")}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedAttendanceType === "count"
                        ? "border-(--primary) bg-(--primary)/10"
                        : "border-(--border) bg-(--background)"
                    }`}
                  >
                    <p className="text-sm font-semibold text-(--foreground)">
                      Custom Count
                    </p>

                    <p className="mt-1 text-xs text-(--muted)">
                      Create categories and record counts for this session.
                    </p>
                  </button>
                </div>
              </div>

              {/* Group Scope */}
              <div>
                <label className="mb-1 block text-xs font-medium text-(--muted)">
                  Group Scope (Optional)
                </label>

                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary)"
                >
                  <option value="">-- Entire Organisation --</option>

                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  disabled={submitting}
                  className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--muted) transition-colors hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--primary-dark) disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create & Start"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          ATTENDANCE MODAL
      ======================================================== */}
      {showMarkModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col space-y-4 rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-(--foreground)">
                    {activeSession.schedule?.name || "Attendance Session"}
                  </h2>

                  <span className="rounded-full bg-(--primary)/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-(--primary)">
                    {activeSession.attendance_type === "count"
                      ? "Custom Count"
                      : "Individual"}
                  </span>
                </div>

                <p className="text-xs text-(--muted)">
                  {new Date(activeSession.session_date).toLocaleDateString()} ·{" "}
                  {activeSession.group?.name || "Entire Organisation"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseMarkModal}
                className="text-lg text-(--muted) hover:text-(--foreground)"
                aria-label="Close attendance modal"
              >
                ✕
              </button>
            </div>

            {/* Loading */}
            {loadingRecords ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-(--muted)">
                Loading attendance records...
              </div>
            ) : activeSession.attendance_type === "count" ? (
              /* ==================================================
                 CUSTOM COUNT ATTENDANCE
                 ================================================== */
              <>
                <div className="flex flex-col gap-3 rounded-lg border border-(--border) bg-(--background) p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-(--foreground)">
                      Session-specific categories
                    </p>

                    <p className="mt-1 text-xs text-(--muted)">
                      These categories belong only to this attendance session.
                    </p>
                  </div>

                  {activeSession.status === "open" && canManageAttendance && (
                    <button
                      type="button"
                      onClick={handleAddCountCategory}
                      className="rounded-lg bg-(--primary) px-3 py-2 text-xs font-semibold text-white hover:bg-(--primary-dark)"
                    >
                      + Add Category
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto rounded-lg border border-(--border)">
                  {draftCountCategories.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-semibold text-(--foreground)">
                        No categories yet
                      </p>

                      <p className="mt-1 text-xs text-(--muted)">
                        Add categories such as Men, Women, Children, Visitors or
                        First Timers.
                      </p>

                      {activeSession.status === "open" &&
                        canManageAttendance && (
                          <button
                            type="button"
                            onClick={handleAddCountCategory}
                            className="mt-4 rounded-lg border border-(--border) px-4 py-2 text-xs font-semibold text-(--foreground) hover:bg-(--background)"
                          >
                            + Add First Category
                          </button>
                        )}
                    </div>
                  ) : (
                    <div className="divide-y divide-(--border)">
                      {draftCountCategories.map((category, index) => (
                        <div
                          key={category.id}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <span className="w-5 text-center text-xs text-(--muted)">
                              {index + 1}
                            </span>

                            <input
                              type="text"
                              value={category.name}
                              disabled={
                                activeSession.status === "closed" ||
                                !canManageAttendance
                              }
                              onChange={(event) =>
                                handleUpdateCountCategory(
                                  category.id,
                                  "name",
                                  event.target.value,
                                )
                              }
                              placeholder="Category name"
                              className="min-w-0 flex-1 rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary) disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={category.count}
                              disabled={
                                activeSession.status === "closed" ||
                                !canManageAttendance
                              }
                              onChange={(event) =>
                                handleUpdateCountCategory(
                                  category.id,
                                  "count",
                                  event.target.value,
                                )
                              }
                              className="w-24 rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-right text-sm font-semibold text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--primary) disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {activeSession.status === "open" &&
                              canManageAttendance && (
                                <>
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() =>
                                      handleMoveCountCategory(category.id, "up")
                                    }
                                    className="rounded border border-(--border) px-2 py-1 text-xs text-(--muted) hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Move category up"
                                  >
                                    ↑
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      index === draftCountCategories.length - 1
                                    }
                                    onClick={() =>
                                      handleMoveCountCategory(
                                        category.id,
                                        "down",
                                      )
                                    }
                                    className="rounded border border-(--border) px-2 py-1 text-xs text-(--muted) hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Move category down"
                                  >
                                    ↓
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveCountCategory(category.id)
                                    }
                                    className="rounded border border-(--border) px-2 py-1 text-xs text-(--error) hover:bg-(--error)/10"
                                    aria-label="Remove category"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-(--border) pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs text-(--muted)">
                      Total counted
                    </span>

                    <p className="text-lg font-bold text-(--foreground)">
                      {totalCountAttendance.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseMarkModal}
                      disabled={savingRecords}
                      className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--muted) transition-colors hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Close
                    </button>

                    {activeSession.status === "open" && canManageAttendance && (
                      <button
                        type="button"
                        onClick={() => void handleSaveCountAttendance()}
                        disabled={savingRecords}
                        className="rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--primary-dark) disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRecords ? "Saving..." : "Save Counts"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ==================================================
                 INDIVIDUAL ATTENDANCE
                 ================================================== */
              <>
                {activeSession.status === "open" && canManageAttendance && (
                  <div className="flex flex-col gap-3 rounded-lg border border-(--border) bg-(--background) p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-semibold text-(--muted)">
                      Quick Bulk Actions:
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleBulkMark("present")}
                        className="rounded bg-(--success)/10 px-3 py-1 text-xs font-semibold text-(--success) hover:bg-(--success)/20"
                      >
                        Mark All Present
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkMark("absent")}
                        className="rounded bg-(--error)/10 px-3 py-1 text-xs font-semibold text-(--error) hover:bg-(--error)/20"
                      >
                        Mark All Absent
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto rounded-lg border border-(--border)">
                  {sessionPeople.length === 0 ? (
                    <div className="p-8 text-center text-xs text-(--muted)">
                      {activeSession.group_id
                        ? "No active people were found in this group."
                        : "No active people records were found in this organisation."}
                      <br />
                      Add people first under the People tab.
                    </div>
                  ) : (
                    <div className="divide-y divide-(--border)">
                      {sessionPeople.map((person) => {
                        const currentStatus = sessionRecords[person.id];

                        return (
                          <div
                            key={person.id}
                            className="flex flex-col gap-3 p-3 transition-colors hover:bg-(--background)/50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-(--foreground)">
                                {person.first_name} {person.last_name}
                              </p>

                              <p className="truncate text-xs text-(--muted)">
                                {person.email || "No email"}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-1">
                              {(
                                [
                                  "present",
                                  "absent",
                                  "late",
                                  "excused",
                                ] as const
                              ).map((status) => {
                                const isActive = currentStatus === status;

                                let activeClasses = "bg-(--primary) text-white";

                                if (status === "present") {
                                  activeClasses = "bg-(--success) text-white";
                                } else if (status === "absent") {
                                  activeClasses = "bg-(--error) text-white";
                                } else if (status === "late") {
                                  activeClasses = "bg-(--warning) text-white";
                                }

                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={
                                      activeSession.status === "closed" ||
                                      !canManageAttendance
                                    }
                                    onClick={() =>
                                      handleSetPersonStatus(person.id, status)
                                    }
                                    className={`rounded px-2.5 py-1 text-xs font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                      isActive
                                        ? activeClasses
                                        : "border border-(--border) bg-(--background) text-(--muted) hover:text-(--foreground)"
                                    }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-(--muted)">
                    {markedCount} of {sessionPeople.length} marked
                  </span>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseMarkModal}
                      disabled={savingRecords}
                      className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--muted) transition-colors hover:text-(--foreground) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Close
                    </button>

                    {activeSession.status === "open" && canManageAttendance && (
                      <button
                        type="button"
                        onClick={() => void handleSaveIndividualAttendance()}
                        disabled={savingRecords || sessionPeople.length === 0}
                        className="rounded-lg bg-(--primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--primary-dark) disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRecords ? "Saving..." : "Save Attendance"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
