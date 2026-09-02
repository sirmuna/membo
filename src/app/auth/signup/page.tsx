"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

export default function SignupPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!acceptTerms) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Account created. Check your email to confirm your account.");

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen bg-[#0D0A1A]">
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
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-97.5">
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

          <div>
            <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
              Create your account
            </h1>
            <p className="mt-3 max-w-sm text-[15px] leading-6 text-[#AAA5BA]">
              Get started with MEMBO today.
            </p>
          </div>

          <form onSubmit={handleSignup} className="mt-9 space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-semibold text-[#E8E5F2]"
              >
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-white/12 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-white/40 focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#E8E5F2]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/12 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-white/40 focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-[#E8E5F2]"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                required
                minLength={8}
                showStrengthIndicator
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-white/12 bg-white/5 px-4 py-3.5 text-[15px] text-white outline-none transition-all placeholder:text-white/40 focus:border-[#8B5CF6] focus:ring-4 focus:ring-[#8B5CF6]/10"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/12 bg-white/5 text-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 focus:ring-offset-0"
                required
              />
              <label
                htmlFor="acceptTerms"
                className="text-sm leading-5 text-[#AAA5BA]"
              >
                I agree to MEMBO&apos;s{" "}
                <Link
                  href="/legal/terms"
                  className="font-medium text-[#A78BFA] hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  className="font-medium text-[#A78BFA] hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-5 text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#9B6AF7] hover:shadow-[0_12px_35px_-12px_rgba(139,92,246,0.6)] focus:outline-none focus:ring-4 focus:ring-[#8B5CF6]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#AAA5BA]">
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="font-semibold text-[#A78BFA] hover:text-white transition-colors"
            >
              Sign in
            </a>
          </p>

          <p className="mt-12 text-center text-xs text-white/30">
            By continuing, you agree to MEMBO&apos;s terms and policies.
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-[#0D0A1A] lg:flex lg:w-[52%]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -right-32 -top-32 h-130 w-130 rounded-full bg-[#6D28D9]/20 blur-[120px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-125 w-125 rounded-full bg-[#8B5CF6]/10 blur-[130px]"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/6"
          aria-hidden="true"
        />

        <div className="relative flex h-full w-full flex-col justify-between px-14 py-14 xl:px-20 xl:py-16">
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
                Get Started
              </span>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="mb-7 h-px w-12 bg-[#A78BFA]" />
            <h2 className="font-serif text-[42px] font-semibold leading-[1.08] tracking-tight text-white xl:text-[54px]">
              Start managing your organisation today.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-7 text-white/45">
              Join thousands of organisations using MEMBO to streamline their
              operations and focus on what matters most.
            </p>
          </div>

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
