"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SidebarSwitcherProps {
  collapsed: boolean;
}

type Organisation = {
  id: string;
  name: string;
  slug: string;
  org_type: string | null;
};

type Role = {
  code: string;
  label: string;
};

type MembershipRow = {
  id: string;
  organisation_id: string;
  status: string;
  organisations: Organisation | Organisation[] | null;
  roles: Role | Role[] | null;
};

type Membership = {
  id: string;
  organisationId: string;
  organisation: Organisation;
  role: Role | null;
};

type Person = {
  id: string;
  name: string;
  email: string | null;
  initials: string;
};

type MenuItem =
  | { kind: "personal" }
  | { kind: "org"; membership: Membership }
  | { kind: "create" }
  | { kind: "join" };

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part && !/^(the|of|and|&)$/i.test(part));

  if (parts.length === 0) return "ME";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata ?? {};
  const candidates = [
    meta.full_name,
    meta.name,
    meta.display_name,
    [meta.first_name, meta.last_name].filter(Boolean).join(" "),
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  if (user.email) {
    const local = user.email.split("@")[0] ?? "";
    const pretty = local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
    if (pretty) return pretty;
  }

  return "You";
}

function personalWorkspaceLabel(name: string) {
  const first = name.trim().split(/\s+/)[0];
  if (!first || first.toLowerCase() === "you") return "Your workspace";
  const possessive = /s$/i.test(first) ? `${first}'` : `${first}'s`;
  return `${possessive} workspace`;
}

function orgTypeLabel(type: string | null) {
  if (!type) return null;
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19c1.2-3.1 3.7-4.6 7-4.6s5.8 1.5 7 4.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Avatar({
  label,
  size = "md",
  active = false,
}: {
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}) {
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold tracking-wide ${dim} ${
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--primary)]/12 text-[var(--primary)] ring-1 ring-[var(--primary)]/15"
      }`}
    >
      {label}
    </div>
  );
}

export function SidebarSwitcher({ collapsed }: SidebarSwitcherProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const menuId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

  const personalPath = "/dashboard";
  const isPersonal =
    pathname === personalPath ||
    pathname === `${personalPath}/` ||
    (pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/dashboard/organizations/"));

  const selectedOrg = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/organizations\/([^/]+)/i);
    if (!match) return null;
    const orgId = match[1];
    return memberships.find((m) => m.organisationId === orgId) ?? null;
  }, [pathname, memberships]);

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return memberships;
    return memberships.filter((m) => {
      const haystack = [
        m.organisation.name,
        m.organisation.slug,
        m.role?.label,
        m.organisation.org_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [memberships, query]);

  const showSearch = memberships.length >= 6;
  const personalTitle = person
    ? personalWorkspaceLabel(person.name)
    : "Your workspace";

  const items: MenuItem[] = useMemo(() => {
    const list: MenuItem[] = [{ kind: "personal" }];
    for (const membership of filteredOrgs) {
      list.push({ kind: "org", membership });
    }
    list.push({ kind: "create" }, { kind: "join" });
    return list;
  }, [filteredOrgs]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Couldn’t load your workspaces.");
      return;
    }

    const name = displayNameFromUser(user);
    setPerson({
      id: user.id,
      name,
      email: user.email ?? null,
      initials: initialsFromName(name),
    });

    const { data, error: membershipError } = await supabase
      .from("organisation_memberships")
      .select(
        `
        id,
        organisation_id,
        status,
        organisations (
          id,
          name,
          slug,
          org_type
        ),
        roles (
          code,
          label
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipError) {
      setLoading(false);
      setError("Couldn’t load organisations.");
      return;
    }

    const next: Membership[] = [];
    for (const row of (data ?? []) as MembershipRow[]) {
      const organisation = unwrap(row.organisations);
      if (!organisation) continue;
      next.push({
        id: row.id,
        organisationId: row.organisation_id,
        organisation,
        role: unwrap(row.roles),
      });
    }

    setMemberships(next);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const placeMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const width = collapsed ? 288 : Math.max(rect.width, 268);
    const estimatedHeight = 380;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    let left = collapsed ? rect.right + gap : rect.left;
    left = Math.min(left, window.innerWidth - width - 12);
    left = Math.max(12, left);

    const top = openUp
      ? Math.max(12, rect.top - estimatedHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - 24);

    setMenuPos({ top, left, width });
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onReposition = () => placeMenu();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, placeMenu, filteredOrgs.length, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = window.setTimeout(() => {
      if (showSearch) searchRef.current?.focus();
      else menuRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(id);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router],
  );

  const activate = useCallback(
    (item: MenuItem) => {
      if (item.kind === "personal") go(personalPath);
      if (item.kind === "org") {
        go(`/dashboard/organizations/${item.membership.organisation.id}`);
      }
      if (item.kind === "create") go("/dashboard/organizations/new");
      if (item.kind === "join") go("/dashboard/organizations/join");
    },
    [go],
  );

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) activate(item);
    }
  };

  const triggerTitle = selectedOrg
    ? selectedOrg.organisation.name
    : personalTitle;
  const triggerSubtitle = selectedOrg
    ? selectedOrg.role?.label || "Member"
    : (person?.email ?? "Signed in");
  const triggerInitials = selectedOrg
    ? initialsFromName(selectedOrg.organisation.name)
    : (person?.initials ?? "ME");

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label="Switch workspace"
          onKeyDown={onMenuKeyDown}
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
          }}
          className="fixed z-[80] origin-top overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.55)] outline-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {showSearch && (
            <div className="px-2 pb-1.5 pt-1">
              <label className="relative block">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  <IconSearch />
                </span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Search organisations"
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </label>
            </div>
          )}

          <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Workspace
          </div>

          <MenuRow
            active={activeIndex === 0}
            selected={isPersonal}
            onClick={() => activate({ kind: "personal" })}
            onHover={() => setActiveIndex(0)}
          >
            <Avatar
              label={person?.initials ?? "ME"}
              size="sm"
              active={isPersonal}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{personalTitle}</p>
              <p className="truncate text-[11px] text-[var(--muted)]">
                {person?.name ?? "You"}
                {person?.email ? ` · ${person.email}` : ""}
              </p>
            </div>
            {isPersonal ? (
              <span className="text-[var(--primary)]">
                <IconCheck />
              </span>
            ) : (
              <span className="text-[var(--muted)]">
                <IconUser />
              </span>
            )}
          </MenuRow>

          <div className="mx-2 my-1.5 h-px bg-[var(--border)]" />

          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Organisations
            </span>
            <span className="text-[10px] tabular-nums text-[var(--muted)]">
              {loading ? "…" : filteredOrgs.length}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto px-1">
            {loading && memberships.length === 0 && (
              <div className="space-y-1 px-2 py-1">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            )}

            {error && (
              <div className="px-3 py-3 text-center">
                <p className="text-xs text-[var(--muted)]">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-2 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filteredOrgs.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-[var(--muted)]">
                {query
                  ? `No organisations match “${query}”.`
                  : "You haven’t joined an organisation yet."}
              </p>
            )}

            {filteredOrgs.map((membership, index) => {
              const itemIndex = index + 1;
              const isActive =
                selectedOrg?.organisationId === membership.organisationId;
              const type = orgTypeLabel(membership.organisation.org_type);

              return (
                <MenuRow
                  key={membership.id}
                  active={activeIndex === itemIndex}
                  selected={isActive}
                  onClick={() => activate({ kind: "org", membership })}
                  onHover={() => setActiveIndex(itemIndex)}
                >
                  <Avatar
                    label={initialsFromName(membership.organisation.name)}
                    size="sm"
                    active={isActive}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {membership.organisation.name}
                    </p>
                    <p className="truncate text-[11px] text-[var(--muted)]">
                      {membership.role?.label || "Member"}
                      {type ? ` · ${type}` : ""}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-[var(--primary)]">
                      <IconCheck />
                    </span>
                  )}
                </MenuRow>
              );
            })}
          </div>

          <div className="mx-2 my-1.5 h-px bg-[var(--border)]" />

          <MenuRow
            active={activeIndex === items.length - 2}
            onClick={() => activate({ kind: "create" })}
            onHover={() => setActiveIndex(items.length - 2)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <IconPlus />
            </span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Create organisation
            </span>
          </MenuRow>
          <MenuRow
            active={activeIndex === items.length - 1}
            onClick={() => activate({ kind: "join" })}
            onHover={() => setActiveIndex(items.length - 1)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <IconSearch />
            </span>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Join organisation
            </span>
          </MenuRow>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative border-b border-[var(--border)] px-3 py-3">
      {collapsed ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          title={triggerTitle}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={onTriggerKeyDown}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] outline-none transition-colors duration-150 hover:border-[var(--primary)]/30 hover:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
        >
          {loading ? (
            <span className="h-7 w-7 animate-pulse rounded-lg bg-[var(--border)]" />
          ) : (
            <Avatar
              label={triggerInitials}
              active={Boolean(selectedOrg) || isPersonal}
            />
          )}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={onTriggerKeyDown}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left outline-none transition-colors duration-150 hover:border-[var(--primary)]/25 hover:bg-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
        >
          {loading ? (
            <>
              <span className="h-9 w-9 animate-pulse rounded-lg bg-[var(--border)]" />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block h-3 w-28 animate-pulse rounded bg-[var(--border)]" />
                <span className="block h-2.5 w-20 animate-pulse rounded bg-[var(--border)]" />
              </span>
            </>
          ) : (
            <>
              <Avatar
                label={triggerInitials}
                active={Boolean(selectedOrg) || isPersonal}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                  {triggerTitle}
                </span>
                <span className="block truncate text-xs text-[var(--muted)]">
                  {triggerSubtitle}
                </span>
              </span>
              <IconChevron open={open} />
            </>
          )}
        </button>
      )}

      {menu}
    </div>
  );
}

function MenuRow({
  children,
  active,
  selected = false,
  onClick,
  onHover,
}: {
  children: ReactNode;
  active: boolean;
  selected?: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={onHover}
      className={`mx-1 flex w-[calc(100%-8px)] items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 ${
        active ? "bg-[var(--background)]" : "bg-transparent"
      } ${selected ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}
    >
      {children}
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 px-1 py-2">
      <span className="h-8 w-8 animate-pulse rounded-lg bg-[var(--border)]" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="block h-3 w-32 animate-pulse rounded bg-[var(--border)]" />
        <span className="block h-2.5 w-20 animate-pulse rounded bg-[var(--border)]" />
      </span>
    </div>
  );
}
