"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { Preloader } from "@/components/preloader";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function redirectIfAuthenticated() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          console.warn("Session check failed:", error.message);
        }

        if (data.user) {
          router.replace("/dashboard");
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error("Session check error:", error);

        if (mounted) {
          setCheckingSession(false);
        }
      }
    }

    void redirectIfAuthenticated();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.user) {
        setError("Sign in completed but no user session was returned.");
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      console.error("[MEMBO AUTH] Sign in failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession || loading) {
    return <Preloader />;
  }

  return (
    <main className="flex min-h-screen bg-(--background)">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgba(255, 255, 255, 0.05) inset;
          -webkit-text-fill-color: white;
          transition: background-color 5000s ease-in-out 0s;
        }
        input:-webkit-autofill::first-line {
          font-family: inherit;
          font-size: inherit;
        }
      `}</style>
      {/* =========================================================
          LOGIN FORM
      ========================================================== */}
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-97.5">
          {/* Brand */}
          <Link
            href="/"
            className="mb-14 inline-flex items-center gap-3 transition-opacity hover:opacity-80"
            aria-label="MEMBO home"
          >
            <Image
              src="/images/membo-t.png"
              alt="MEMBO"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />

            <span className="font-serif text-2xl font-semibold tracking-tight text-white">
              MEMBO
            </span>
          </Link>

          {/* Heading */}
          <div>
            <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
              Welcome back
            </h1>

            <p className="mt-3 max-w-sm text-[15px] leading-6 text-[#AAA5BA]">
              Sign in to continue to your MEMBO workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-9 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#E8E5F2]"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                }}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full rounded-lg border border-white/12 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-white/40 focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[#E8E5F2]"
                >
                  Password
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-[#A78BFA] transition-colors hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>

              <PasswordInput
                id="password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (error) setError("");
                }}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-lg border border-white/12 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-white/40 focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-400"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-(--primary) px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-(--primary-light) hover:shadow-[0_12px_35px_-12px_rgba(139,92,246,0.6)] focus:outline-none focus:ring-4 focus:ring-(--primary)/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white"
                    aria-hidden="true"
                  />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Signup */}
          <p className="mt-8 text-center text-sm text-[#AAA5BA]">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-[#A78BFA] transition-colors hover:text-white"
            >
              Create an account
            </Link>
          </p>

          {/* Subtle footer */}
          <p className="mt-12 text-center text-xs text-white/30">
            By continuing, you agree to MEMBO&apos;s{" "}
            <Link
              href="/legal/terms"
              className="text-[#A78BFA] hover:text-white transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="text-[#A78BFA] hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      {/* =========================================================
          DARK BRAND PANEL
      ========================================================== */}
      <aside className="relative hidden overflow-hidden bg-(--background) lg:flex lg:w-[52%]">
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        {/* Ambient glow - purple */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-130 w-130 rounded-full bg-[#6D28D9]/20 blur-[120px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-125 w-125 rounded-full bg-(--primary)/10 blur-[130px]"
          aria-hidden="true"
        />

        {/* Fine border */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/6"
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative flex h-full w-full flex-col justify-between px-14 py-14 xl:px-20 xl:py-16">
          {/* Top spacing / decorative element */}
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-(--primary-light)" />
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
                Workspace
              </span>
            </div>
          </div>

          {/* Main statement */}
          <div className="max-w-xl">
            <div className="mb-7 h-px w-12 bg-(--primary-light)" />

            <h2 className="font-serif text-[42px] font-semibold leading-[1.08] tracking-tight text-white xl:text-[54px]">
              Everything your organisation needs.
            </h2>

            <p className="mt-6 max-w-md text-[16px] leading-7 text-white/45">
              One focused workspace for the people, groups, and operations that
              keep your organisation moving.
            </p>
          </div>

          {/* Bottom attribution */}
          <div className="flex items-end justify-between gap-6">
            <p className="text-xs text-white/25">
              Your organisation. Your workspace.
            </p>

            <p className="text-xs font-medium tracking-wide text-white/30">
              A product of <span className="text-white/55">MUNACORE</span>
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
