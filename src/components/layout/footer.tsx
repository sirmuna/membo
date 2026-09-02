import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0D0A1A]">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/30">
            © 2026 MUNACORE LIMITED. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/legal/terms"
              className="text-sm text-white/40 hover:text-[#A78BFA] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal/privacy"
              className="text-sm text-white/40 hover:text-[#A78BFA] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
