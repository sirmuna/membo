"use client";

import { useTheme } from "@/contexts/theme-context";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      value: "light" as const,
      label: "Light",
      description: "Clean and bright interface",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      value: "dark" as const,
      label: "Dark",
      description: "Easy on the eyes",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
    },
    {
      value: "system" as const,
      label: "System",
      description: "Follows your device settings",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Appearance
        </h3>
        <p className="text-sm text-[var(--muted)] mt-1">
          Choose how MEMBO looks to you
        </p>
      </div>

      <div className="space-y-2">
        {themes.map((t) => (
          <label
            key={t.value}
            className={[
              "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
              theme === t.value
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50",
            ].join(" ")}
          >
            <input
              type="radio"
              name="theme"
              value={t.value}
              checked={theme === t.value}
              onChange={() => setTheme(t.value)}
              className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)] focus:ring-offset-0"
            />
            <div className="flex items-center gap-3 flex-1">
              <div
                className={[
                  "p-2 rounded-lg",
                  theme === t.value
                    ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                    : "bg-(--background) text-[var(--muted)]",
                ].join(" ")}
              >
                {t.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--foreground)]">
                  {t.label}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {t.description}
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
