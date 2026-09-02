"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const ROLL_CALL_ROWS = [
  { name: "David Muna", role: "Leader" },
  { name: "Austin King", role: "Usher" },
  { name: "Michael Godfrey", role: "Member" },
  { name: "Shedrack Ibrahim", role: "Member" },
  { name: "Frank Emmanuel", role: "Group Leader" },
  { name: "Joshua Peter", role: "Member" },
];

const FEATURES = [
  {
    icon: PeopleIcon,
    eyebrow: "People",
    title: "People & Membership",
    description:
      "Keep member profiles, memberships, and organisational records organised in one central workspace.",
  },
  {
    icon: AttendanceIcon,
    eyebrow: "Attendance",
    title: "Attendance Management",
    description:
      "Record attendance quickly and understand participation across services, meetings, groups, and activities.",
  },
  {
    icon: GroupsIcon,
    eyebrow: "Structure",
    title: "Groups & Organisation",
    description:
      "Create groups, assign leaders, manage memberships, and reflect the way your organisation actually works.",
  },
  {
    icon: DashboardIcon,
    eyebrow: "Access",
    title: "Role-Based Workspaces",
    description:
      "Give leaders, managers, and members the information and tools relevant to their role.",
  },
];

const AUDIENCE = [
  "Churches",
  "Ministries",
  "Non-profits",
  "Associations",
  "Clubs",
  "Community groups",
];

const ROLE_VIEWS = {
  leader: {
    label: "Leader",
    heading: "See the organisation clearly.",
    description:
      "Leaders get the oversight they need without having to dig through spreadsheets, paper records, or disconnected tools.",
    items: [
      "Monitor attendance across groups and services",
      "Manage people and membership records",
      "Create and organise groups",
      "Manage group leaders and access",
      "Send relevant organisational notifications",
    ],
  },
  member: {
    label: "Member",
    heading: "Everything you need. Nothing you don't.",
    description:
      "Members get a focused workspace built around their participation, groups, attendance, and organisational updates.",
    items: [
      "View your organisation and group memberships",
      "Track your attendance history",
      "Access relevant organisational information",
      "Receive notifications and group updates",
      "Keep selected personal information current",
    ],
  },
} as const;

type RoleView = keyof typeof ROLE_VIEWS;

/** Central place for auth destinations, so the redirect target only lives in one spot. */
const AUTH_LOGIN_PATH = "/auth/login";
const AUTH_SIGNUP_PATH = "/auth/login?intent=signup";

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [roleView, setRoleView] = useState<RoleView>("leader");
  const [presentCount, setPresentCount] = useState(0);

  const totalRows = ROLL_CALL_ROWS.length;

  useEffect(() => {
    let cycleTimeouts: ReturnType<typeof setTimeout>[] = [];

    const runRollCall = () => {
      cycleTimeouts.forEach(clearTimeout);
      cycleTimeouts = [];

      setPresentCount(0);

      cycleTimeouts = ROLL_CALL_ROWS.map((_, index) =>
        setTimeout(
          () => {
            setPresentCount((count) =>
              Math.min(count + 1, ROLL_CALL_ROWS.length),
            );
          },
          500 + index * 550,
        ),
      );
    };

    runRollCall();

    const loop = setInterval(runRollCall, 500 + totalRows * 550 + 2600);

    return () => {
      cycleTimeouts.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [totalRows]);

  const activeRole = useMemo(() => ROLE_VIEWS[roleView], [roleView]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0D0A1A] text-[#E8E5F2] antialiased selection:bg-[#8B5CF6] selection:text-white">
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .membo-display {
          font-family: var(--font-display), ui-serif, Georgia, serif;
        }

        .membo-body {
          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
        }

        .membo-mono {
          font-family: var(--font-mono), ui-monospace, SFMono-Regular, monospace;
        }

        @keyframes membo-check-in {
          from {
            opacity: 0;
            transform: scale(0.6) rotate(-8deg);
          }

          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        .membo-check {
          animation: membo-check-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .membo-check {
            animation: none !important;
          }
        }
      `}</style>

      <div className="membo-body">
        <Nav
          mobileNavOpen={mobileNavOpen}
          setMobileNavOpen={setMobileNavOpen}
        />

        <main>
          <Hero presentCount={presentCount} totalRows={totalRows} />

          <TrustStrip />

          <Audience />

          <Features />

          <RoleShowcase
            roleView={roleView}
            setRoleView={setRoleView}
            activeRole={activeRole}
          />

          <CtaBanner />
        </main>

        <Footer />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal — lightweight entrance-only scroll animation                       */
/* -------------------------------------------------------------------------- */

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
}

function Reveal({
  children,
  className = "",
  as: Tag = "div",
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setVisible(true);
        observer.unobserve(node);
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const Component = Tag as ElementType;

  return (
    <Component
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </Component>
  );
}
/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

interface NavProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

function Nav({ mobileNavOpen, setMobileNavOpen }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        scrolled
          ? "border-white/10 bg-[#0D0A1A]/90 shadow-[0_1px_0_rgba(255,255,255,0.04)]"
          : "border-white/5 bg-[#0D0A1A]/70"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="MEMBO home"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
        >
          <Image
            src="/images/membo-t.png"
            alt="MEMBO"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />

          <span className="membo-display text-[19px] font-bold tracking-[-0.02em] text-white">
            MEMBO
          </span>
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Primary navigation"
        >
          <a
            href="#features"
            className="text-sm font-medium text-[#AAA5BA] transition-colors hover:text-white"
          >
            Features
          </a>

          <a
            href="#who-its-for"
            className="text-sm font-medium text-[#AAA5BA] transition-colors hover:text-white"
          >
            Who it&apos;s for
          </a>

          <a
            href="#roles"
            className="text-sm font-medium text-[#AAA5BA] transition-colors hover:text-white"
          >
            Roles
          </a>

          <Link
            href={AUTH_LOGIN_PATH}
            className="text-sm font-medium text-[#AAA5BA] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B5CF6]"
          >
            Log in
          </Link>

          <Link
            href={AUTH_SIGNUP_PATH}
            className="rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_-12px_rgba(139,92,246,0.8)] transition-all hover:bg-[#9B6AF7] hover:shadow-[0_10px_35px_-8px_rgba(139,92,246,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A78BFA]"
          >
            Get started
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/5 md:hidden"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-navigation"
          aria-label={
            mobileNavOpen ? "Close navigation menu" : "Open navigation menu"
          }
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className={`grid overflow-hidden border-t border-white/5 bg-[#0D0A1A] transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          mobileNavOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-0"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-1 px-5 py-5">
            <a
              href="#features"
              onClick={closeMobileNav}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#AAA5BA] hover:bg-white/4 hover:text-white"
            >
              Features
            </a>

            <a
              href="#who-its-for"
              onClick={closeMobileNav}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#AAA5BA] hover:bg-white/5 hover:text-white"
            >
              Who it&apos;s for
            </a>

            <a
              href="#roles"
              onClick={closeMobileNav}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#AAA5BA] hover:bg-white/5 hover:text-white"
            >
              Roles
            </a>

            <Link
              href={AUTH_LOGIN_PATH}
              onClick={closeMobileNav}
              className="rounded-lg px-3 py-3 text-sm font-medium text-[#AAA5BA] hover:bg-white/5 hover:text-white"
            >
              Log in
            </Link>

            <Link
              href={AUTH_SIGNUP_PATH}
              onClick={closeMobileNav}
              className="mt-2 rounded-lg bg-[#8B5CF6] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

interface HeroProps {
  presentCount: number;
  totalRows: number;
}

function Hero({ presentCount, totalRows }: HeroProps) {
  const progress = totalRows > 0 ? (presentCount / totalRows) * 100 : 0;

  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28 lg:px-8">
      {/* Background atmosphere — static, no continuous animation */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[-180px] h-[520px] w-[520px] rounded-full bg-[#6D28D9]/20 blur-[120px]" />
        <div className="absolute right-[-120px] top-[10%] h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/10 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.13),transparent_65%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <Reveal>
          <div className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]" />
            <span className="membo-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[#AFA8C4]">
              Organisation management, simplified
            </span>
          </div>

          <h1 className="membo-display mt-7 max-w-3xl text-[2.7rem] font-bold leading-[1.04] tracking-[-0.045em] text-white sm:text-5xl lg:text-[4.35rem]">
            Run your organisation
            <span className="block text-[#A78BFA]">with clarity.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-[17px] leading-8 text-[#AAA5BA] sm:text-lg">
            MEMBO brings your people, groups, attendance, and organisational
            activities into one structured workspace, so your organisation can
            spend less time managing records and more time doing the work that
            matters.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href={AUTH_SIGNUP_PATH}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_35px_-12px_rgba(139,92,246,0.75)] transition-all hover:-translate-y-0.5 hover:bg-[#9B6AF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A78BFA]"
            >
              Get started free
              <ArrowRightIcon />
            </Link>

            <Link
              href={AUTH_LOGIN_PATH}
              className="rounded-lg border border-white/12 bg-white/2 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-white/22 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A78BFA]"
            >
              Log in
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#77718B]">
            <span className="flex items-center gap-2">
              <CheckIcon />
              Built for organisations
            </span>

            <span className="flex items-center gap-2">
              <CheckIcon />
              Role-based access
            </span>

            <span className="flex items-center gap-2">
              <CheckIcon />
              Start free
            </span>
          </div>
        </Reveal>

        <Reveal
          delay={120}
          className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:ml-auto"
        >
          {/* Glow behind product visual */}
          <div
            aria-hidden
            className="absolute inset-x-12 top-8 h-[380px] rounded-full bg-[#7C3AED]/20 blur-[90px]"
          />

          {/* Decorative group card */}
          <div
            aria-hidden
            className="absolute -right-2 -top-8 z-0 hidden w-[82%] rotate-4 rounded-2xl border border-white/8 bg-[#171229] p-5 shadow-2xl sm:block"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="membo-mono text-[10px] uppercase tracking-[0.15em] text-[#706985]">
                  Group
                </p>

                <p className="membo-display mt-1 text-lg font-semibold text-white">
                  Technical Unit
                </p>
              </div>

              <div className="flex -space-x-2">
                <Avatar initials="AO" />
                <Avatar initials="TB" />
                <Avatar initials="GU" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/7 pt-4">
              <span className="text-xs text-[#706985]">18 members</span>
              <span className="text-xs font-medium text-[#A78BFA]">
                2 leaders
              </span>
            </div>
          </div>

          {/* Attendance card — the page's signature element */}
          <div className="relative z-10 mt-8 -rotate-[1.5deg] rounded-3xl border border-black/6 bg-[#F8F7FC] p-5 text-[#171326] shadow-[0_35px_100px_-30px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-out hover:rotate-0 sm:p-6">
            <div className="flex items-start justify-between border-b border-[#171326]/10 pb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
                  <AttendanceIcon />
                </div>

                <div>
                  <p className="membo-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#8B849D]">
                    Attendance
                  </p>

                  <p className="membo-display text-lg font-bold">
                    Sunday Service
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="membo-mono text-2xl font-semibold tabular-nums text-[#171326]">
                  {presentCount}
                  <span className="text-[#9B94A9]">/{totalRows}</span>
                </p>

                <p className="membo-mono text-[9px] uppercase tracking-[0.12em] text-[#8B849D]">
                  Present
                </p>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-1">
              {ROLL_CALL_ROWS.map((row, index) => {
                const checkedIn = index < presentCount;

                return (
                  <li
                    key={row.name}
                    className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-[#171326]/3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          checkedIn
                            ? "membo-check border-[#8B5CF6] bg-[#8B5CF6] text-white"
                            : "border-[#171326]/15 text-transparent"
                        }`}
                      >
                        ✓
                      </span>

                      <span className="truncate text-sm font-medium">
                        {row.name}
                      </span>
                    </div>

                    <span className="membo-mono ml-3 shrink-0 text-[9px] uppercase tracking-widest text-[#8B849D]">
                      {row.role}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#8B849D]">
                  Attendance progress
                </span>

                <span className="membo-mono text-[10px] text-[#8B849D]">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#171326]/10">
                <div
                  className="h-full rounded-full bg-[#7C3AED] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Floating status */}
          <div className="absolute -bottom-5 -left-3 z-20 hidden rounded-xl border border-white/8 bg-[#18132B] px-4 py-3 shadow-2xl sm:block">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/15 text-[#A78BFA]">
                <CheckIcon />
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Attendance updated
                </p>
                <p className="mt-0.5 text-[10px] text-[#77718B]">Just now</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust Strip                                                                */
/* -------------------------------------------------------------------------- */

function TrustStrip() {
  return (
    <section className="border-y border-white/6 bg-[#100C1E]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-7 sm:flex-row sm:px-6 lg:px-8">
        <p className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#625B76]">
          One workspace for the essentials
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-[#827B94]">
          <span>People</span>
          <span className="h-1 w-1 rounded-full bg-[#514A63]" />
          <span>Groups</span>
          <span className="h-1 w-1 rounded-full bg-[#514A63]" />
          <span>Attendance</span>
          <span className="h-1 w-1 rounded-full bg-[#514A63]" />
          <span>Notifications</span>
          <span className="h-1 w-1 rounded-full bg-[#514A63]" />
          <span>Roles</span>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Audience                                                                   */
/* -------------------------------------------------------------------------- */

function Audience() {
  return (
    <section
      id="who-its-for"
      className="scroll-mt-24 px-5 py-24 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <Reveal>
            <span className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8F86A6]">
              Who it&apos;s for
            </span>

            <h2 className="membo-display mt-4 max-w-xl text-3xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-4xl">
              Membo is built for 
              <span className="block text-[#A78BFA]">
                For Organisations.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <p className="max-w-2xl text-[16px] leading-8 text-[#9992A9]">
              MEMBO gives membership-based organisations a structured way to
              manage their people and activities without forcing them to stitch
              together spreadsheets, paper records, and disconnected tools.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {AUDIENCE.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/8 bg-white/3 px-4 py-2 text-xs font-medium text-[#A8A1B8] transition-colors hover:border-[#8B5CF6]/40 hover:text-[#D0C8E2]"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-24 border-y border-white/6 bg-[#100C1E] px-5 py-24 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-2xl">
          <span className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8F86A6]">
            Core capabilities
          </span>

          <h2 className="membo-display mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
            The operational foundation
            <span className="text-[#A78BFA]"> your organisation needs.</span>
          </h2>

          <p className="mt-5 text-[16px] leading-8 text-[#9992A9]">
            MEMBO brings the core pieces of organisation management into one
            coherent system.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Reveal key={feature.title} delay={index * 80}>
                <article className="group h-full rounded-2xl border border-white/8 bg-[#151024] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#8B5CF6]/35 hover:shadow-[0_24px_60px_-30px_rgba(139,92,246,0.4)] sm:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 text-[#A78BFA] transition-colors group-hover:border-[#8B5CF6]/40 group-hover:bg-[#8B5CF6]/15">
                      <Icon />
                    </div>

                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#9C94AE]">
                      {feature.eyebrow}
                    </span>
                  </div>

                  <h3 className="membo-display mt-7 text-xl font-bold tracking-[-0.02em] text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-7 text-[#8F899F]">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Role Showcase                                                              */
/* -------------------------------------------------------------------------- */

interface RoleShowcaseProps {
  roleView: RoleView;
  setRoleView: (role: RoleView) => void;
  activeRole: (typeof ROLE_VIEWS)[RoleView];
}

function RoleShowcase({
  roleView,
  setRoleView,
  activeRole,
}: RoleShowcaseProps) {
  return (
    <section
      id="roles"
      className="scroll-mt-24 px-5 py-24 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
          <Reveal>
            <span className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#8F86A6]">
              Role-based experience
            </span>

            <h2 className="membo-display mt-4 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
              One organisation.
              <span className="block text-[#A78BFA]">
                Different responsibilities.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#9992A9]">
              MEMBO adapts the workspace to the person using it. Leaders get
              oversight while members get a focused view of what matters to
              them.
            </p>

            <div
              role="tablist"
              aria-label="Dashboard role"
              className="mt-8 inline-flex rounded-xl border border-white/8 bg-white/3 p-1"
            >
              {(Object.keys(ROLE_VIEWS) as RoleView[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={roleView === key}
                  onClick={() => setRoleView(key)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A78BFA] ${
                    roleView === key
                      ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20"
                      : "text-[#817A92] hover:text-white"
                  }`}
                >
                  {ROLE_VIEWS[key].label}
                </button>
              ))}
            </div>
          </Reveal>

          <div
            key={roleView}
            className="animate-[membo-role-in_0.5s_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <style>{`
              @keyframes membo-role-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @media (prefers-reduced-motion: reduce) {
                .animate-\\[membo-role-in_0\\.5s_cubic-bezier\\(0\\.16\\,1\\,0\\.3\\,1\\)_both\\] {
                  animation: none !important;
                }
              }
            `}</style>

            <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#151024] p-2 shadow-[0_30px_100px_-45px_rgba(139,92,246,0.35)]">
              <div className="rounded-2xl border border-[#171326]/10 bg-[#F8F7FC] p-6 text-[#171326] sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="membo-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#8B849D]">
                      {activeRole.label} workspace
                    </p>

                    <h3 className="membo-display mt-2 text-2xl font-bold tracking-[-0.025em]">
                      {activeRole.heading}
                    </h3>
                  </div>

                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] sm:flex">
                    <DashboardIcon />
                  </div>
                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-[#6E687A]">
                  {activeRole.description}
                </p>

                <ul className="mt-7 divide-y divide-[#171326]/10">
                  {activeRole.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 py-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                        <CheckIcon />
                      </span>

                      <span className="text-sm font-medium text-[#272235]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* CTA                                                                        */
/* -------------------------------------------------------------------------- */

function CtaBanner() {
  return (
    <section className="px-5 pb-24 sm:px-6 lg:px-8 lg:pb-32">
      <Reveal>
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[#8B5CF6]/20 bg-[#151024] px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-220px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#7C3AED]/15 blur-[120px]"
          />

          <div className="relative">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/10">
              <Image
                src="/images/membo-t.png"
                alt=""
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
              />
            </div>

            <h2 className="membo-display mx-auto mt-7 max-w-3xl text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
              Give your organisation
              <span className="text-[#A78BFA]"> a better system.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-8 text-[#91899F]">
              Bring people, groups, attendance, and organisational activities
              together in one structured workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={AUTH_SIGNUP_PATH}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_35px_-12px_rgba(139,92,246,0.75)] transition-all hover:-translate-y-0.5 hover:bg-[#9B6AF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A78BFA]"
              >
                Get started free
                <ArrowRightIcon />
              </Link>

              <Link
                href={AUTH_LOGIN_PATH}
                className="rounded-lg border border-white/10 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/20 hover:bg-white/4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A78BFA]"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#090711]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="MEMBO home"
              className="inline-flex items-center gap-2.5"
            >
              <Image
                src="/images/membo-t.png"
                alt="MEMBO"
                width={34}
                height={34}
                priority
                className="h-8 w-8 object-contain"
              />

              <span className="membo-display text-xl font-bold tracking-[-0.025em] text-white">
                MEMBO
              </span>
            </Link>

            <p className="mt-5 text-sm leading-7 text-[#756E82]">
              A structured workspace for managing people, groups, attendance,
              and organisational activities, built for organisations.
            </p>

            {/* NOTE: update href to your real MUNACORE URL — munacore.com is a placeholder */}
            <a
              href="https://munacore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-3.5 py-1.5 text-xs font-medium text-[#8B8496] transition-colors hover:border-[#8B5CF6]/40 hover:text-[#C4B5FD]"
            >
              A product of
              <span className="font-semibold text-[#A78BFA]">MUNACORE</span>
              <ArrowUpRightIcon />
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#81798F]">
              Product
            </h3>

            <nav className="mt-5 flex flex-col gap-3">
              <a
                href="#features"
                className="text-sm text-[#6F687C] transition-colors hover:text-white"
              >
                Features
              </a>

              <a
                href="#who-its-for"
                className="text-sm text-[#6F687C] transition-colors hover:text-white"
              >
                Who it&apos;s for
              </a>

              <a
                href="#roles"
                className="text-sm text-[#6F687C] transition-colors hover:text-white"
              >
                Roles
              </a>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="membo-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#81798F]">
              Account
            </h3>

            <nav className="mt-5 flex flex-col gap-3">
              <Link
                href={AUTH_LOGIN_PATH}
                className="text-sm text-[#6F687C] transition-colors hover:text-white"
              >
                Log in
              </Link>

              <Link
                href={AUTH_SIGNUP_PATH}
                className="text-sm text-[#6F687C] transition-colors hover:text-white"
              >
                Get started
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#514B5D]">
            © {new Date().getFullYear()} MUNACORE. All rights reserved.
          </p>

          <p className="text-xs text-[#514B5D]">
            MEMBO · Organisation management, simplified.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171229] bg-[#2A2145] text-[8px] font-semibold text-[#C4B5FD]">
      {initials}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 17L17 7M8 7h9v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 19c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="16.5"
        cy="8.5"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M15 13.6c2.79.3 5 2.6 5 5.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m8.5 13.5 2 2 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 3v3M15.5 3v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="9"
        y="14"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 10v2a2 2 0 0 0 2 2M17 10v2a2 2 0 0 1-2 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="3.5"
        width="8"
        height="8"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13.5"
        y="3.5"
        width="7"
        height="5"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13.5"
        y="10.5"
        width="7"
        height="10"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="3.5"
        y="13.5"
        width="8"
        height="7"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
