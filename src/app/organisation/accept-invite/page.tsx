"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AcceptInviteContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        const { data, error: fetchError } = await supabase
          .from("organisation_invitations")
          .select(
            `
            *,
            organisations (*),
            roles (*)
          `,
          )
          .eq("token", token)
          .single();

        if (fetchError || !data) {
          throw new Error("Invitation not found or invalid.");
        }

        // Check if invitation is expired or not pending
        if (data.status !== "pending") {
          throw new Error(`This invitation has already been ${data.status}.`);
        }

        if (new Date(data.expires_at) < new Date()) {
          throw new Error(
            "This invitation has expired. Please ask the administrator for a new one.",
          );
        }

        setInvitation(data);
      } catch (err: any) {
        console.error("Failed to load invitation:", err);
        setError(err.message || "Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token, supabase]);

  async function handleAccept() {
    if (!token) return;

    setAccepting(true);
    setError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Store destination and redirect to signup/login
        const nextUrl = encodeURIComponent(
          `/organisation/accept-invite?token=${token}`,
        );
        if (window.addToast) {
          window.addToast(
            "Please sign in or create an account to accept the invitation",
            "info",
          );
        }
        router.push(`/auth/login?next=${nextUrl}`);
        return;
      }

      // Call Accept Invitation RPC
      const { data: orgId, error: rpcError } = await supabase.rpc(
        "accept_organisation_invitation",
        { p_token: token },
      );

      if (rpcError) throw rpcError;

      if (window.addToast) {
        window.addToast("Invitation accepted successfully!", "success");
      }
      router.push(`/dashboard/organizations/${orgId}`);
    } catch (err: any) {
      console.error("Failed to accept invitation:", err);
      setError(err.message || "Failed to accept invitation. Please try again.");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--primary)] border-r-2 mx-auto mb-4"></div>
        <p className="text-[var(--muted)]">Loading invitation details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Invitation Error
        </h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full py-2.5 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] transition-all cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const organisation = invitation?.organisations;
  const role = invitation?.roles;

  return (
    <div className="max-w-md w-full space-y-8 bg-[var(--surface)] p-8 rounded-xl border border-[var(--border)] shadow-xl relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 text-center space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            You're Invited!
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)] font-medium">
            Join the organisation workspace on MEMBO
          </p>
        </div>

        <div className="bg-(--background) p-6 rounded-lg border border-[var(--border)] space-y-4 text-left">
          <div>
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Organisation
            </span>
            <h3 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
              {organisation?.name}
            </h3>
            <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
              ID: {organisation?.slug}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              Invited Role
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[var(--primary)]/10 text-[var(--primary)] px-3 py-1 text-xs font-semibold">
                {role?.label || "Member"}
              </span>
              <span className="text-xs text-[var(--muted)]">
                ({role?.description})
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[var(--primary)]/30 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center"
          >
            {accepting ? "Accepting Invite..." : "Accept Invitation & Join"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 border border-[var(--border)] text-[var(--foreground)] text-sm font-semibold rounded-lg hover:bg-[var(--border)]/20 transition-all cursor-pointer flex items-center justify-center"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="min-h-screen bg-(--background) py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--primary)] border-r-2 mx-auto mb-4"></div>
            <p className="text-[var(--muted)]">Loading...</p>
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </main>
  );
}
