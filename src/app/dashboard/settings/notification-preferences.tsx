"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotificationPreferencesProps {
  userId: string;
}

interface Preferences {
  email_notifications: boolean;
  push_notifications: boolean;
  organisation_updates: boolean;
  membership_changes: boolean;
  attendance_reminders: boolean;
}

export default function NotificationPreferences({
  userId,
}: NotificationPreferencesProps) {
  const supabase = createClient();

  const [preferences, setPreferences] = useState<Preferences>({
    email_notifications: true,
    push_notifications: true,
    organisation_updates: true,
    membership_changes: true,
    attendance_reminders: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 means no rows returned, which is fine for new users
          console.error("Failed to load preferences:", error);
        }

        if (data) {
          setPreferences({
            email_notifications: data.email_notifications ?? true,
            push_notifications: data.push_notifications ?? true,
            organisation_updates: data.organisation_updates ?? true,
            membership_changes: data.membership_changes ?? true,
            attendance_reminders: data.attendance_reminders ?? true,
          });
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      } finally {
        setInitialLoad(false);
      }
    }

    loadPreferences();
  }, [userId, supabase]);

  async function handleToggle(key: keyof Preferences) {
    const newValue = !preferences[key];
    const updatedPreferences = { ...preferences, [key]: newValue };
    setPreferences(updatedPreferences);

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // First check if table exists by attempting to select
      const { error: checkError } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .limit(1);

      if (checkError && checkError.code === "42P01") {
        // Table doesn't exist, create it
        const { error: createError } = await supabase.rpc(
          "create_notification_preferences_table",
        );
        if (createError) {
          throw new Error(
            "Notification preferences table not set up. Please contact support.",
          );
        }
      }

      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: userId,
          ...updatedPreferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

      if (error) {
        throw error;
      }

      setMessage("Preferences updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update preferences.",
      );
      // Revert on error
      setPreferences({ ...preferences, [key]: !newValue });
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Notification Preferences
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Loading...</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        Notification Preferences
      </h2>

      <p className="text-sm text-[var(--muted)] mb-6">
        Choose which notifications you want to receive.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label
              htmlFor="email_notifications"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Email Notifications
            </label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Receive notifications via email
            </p>
          </div>
          <input
            id="email_notifications"
            type="checkbox"
            checked={preferences.email_notifications}
            onChange={() => handleToggle("email_notifications")}
            disabled={loading}
            className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label
              htmlFor="push_notifications"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Push Notifications
            </label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Receive in-app notifications
            </p>
          </div>
          <input
            id="push_notifications"
            type="checkbox"
            checked={preferences.push_notifications}
            onChange={() => handleToggle("push_notifications")}
            disabled={loading}
            className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label
              htmlFor="organisation_updates"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Organisation Updates
            </label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Updates about your organisations
            </p>
          </div>
          <input
            id="organisation_updates"
            type="checkbox"
            checked={preferences.organisation_updates}
            onChange={() => handleToggle("organisation_updates")}
            disabled={loading}
            className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
          <div>
            <label
              htmlFor="membership_changes"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Membership Changes
            </label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Changes to your membership status
            </p>
          </div>
          <input
            id="membership_changes"
            type="checkbox"
            checked={preferences.membership_changes}
            onChange={() => handleToggle("membership_changes")}
            disabled={loading}
            className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <label
              htmlFor="attendance_reminders"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Attendance Reminders
            </label>
            <p className="text-xs text-[var(--muted)] mt-1">
              Reminders for upcoming attendance sessions
            </p>
          </div>
          <input
            id="attendance_reminders"
            type="checkbox"
            checked={preferences.attendance_reminders}
            onChange={() => handleToggle("attendance_reminders")}
            disabled={loading}
            className="h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 p-4 text-sm text-[var(--error)]">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
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
            {error}
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/5 p-4 text-sm text-[var(--success)]">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
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
            {message}
          </div>
        </div>
      )}
    </section>
  );
}
