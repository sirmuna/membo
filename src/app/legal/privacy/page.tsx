"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
  const router = useRouter();

  const sections = [
    {
      number: 1,
      title: "Who We Are",
      content:
        "MEMBO is operated by MUNACORE LIMITED. This Privacy Policy explains how personal information is handled through MEMBO.",
    },
    {
      number: 2,
      title: "Scope",
      content:
        "This Policy applies to information processed through MEMBO, including information provided when users create accounts, join organisations, create organisations, use MEMBO, or communicate with MUNACORE LIMITED. Organisation-controlled information may additionally be subject to the organisation&apos;s own privacy practices.",
      list: [
        "Create accounts",
        "Join organisations",
        "Create organisations",
        "Use MEMBO",
        "Communicate with MUNACORE LIMITED",
      ],
    },
    {
      number: 3,
      title: "Information We Collect",
      subsections: [
        {
          subtitle: "Account information",
          items: [
            "Full name",
            "Email address",
            "Authentication information",
            "Account identifiers",
            "Account status",
          ],
        },
        {
          subtitle: "Organisation information",
          items: [
            "Organisation memberships",
            "Roles",
            "Permissions",
            "Invitations",
            "Join requests",
            "Organisation relationships",
          ],
        },
        {
          subtitle: "Organisation-managed information",
          intro: "Depending on organisational use:",
          items: [
            "Names",
            "Email addresses",
            "Profiles",
            "Groups",
            "Attendance",
            "Dues records",
            "Notifications",
            "Other organisational records",
          ],
        },
        {
          subtitle: "Technical information",
          intro: "MEMBO may process:",
          items: [
            "IP address",
            "Browser information",
            "Device information",
            "Authentication events",
            "Timestamps",
            "Error information",
            "Security and service activity",
          ],
        },
        {
          subtitle: "Communications",
          content:
            "Information submitted when contacting MEMBO may be retained to provide support and maintain appropriate records.",
        },
      ],
    },
    {
      number: 4,
      title: "How We Use Information",
      content: "Information may be used to:",
      list: [
        "Create accounts",
        "Authenticate users",
        "Provide organisation access",
        "Apply roles and permissions",
        "Provide MEMBO features",
        "Send verification and security emails",
        "Send service communications",
        "Maintain and improve MEMBO",
        "Detect fraud and abuse",
        "Protect system security",
        "Comply with applicable law",
      ],
    },
    {
      number: 5,
      title: "Organisation-Controlled Information",
      content:
        "MEMBO separates individual accounts from organisation memberships. Organisations may control information about their members and determine who can access that information through MEMBO&apos;s roles and permissions. Where an organisation controls personal information, the organisation is responsible for determining its lawful basis and complying with applicable privacy and data-protection obligations. Users may need to contact the relevant organisation regarding information that the organisation controls.",
    },
    {
      number: 6,
      title: "Legal Basis",
      content:
        "Depending on the circumstances, personal information may be processed based on consent, contractual necessity, legal obligations, legitimate interests, protection of rights or safety, or other lawful bases recognised by applicable law. Where processing relies on consent, users may have the right to withdraw that consent, subject to applicable limitations.",
      list: [
        "Consent",
        "Contractual necessity",
        "Legal obligations",
        "Legitimate interests",
        "Protection of rights or safety",
        "Other lawful bases recognised by applicable law",
      ],
    },
    {
      number: 7,
      title: "Sharing Information",
      content:
        "MUNACORE LIMITED does not sell personal information. Information may be shared with service providers where necessary to operate MEMBO, including providers supporting hosting, authentication, databases, storage, email, security, monitoring, and infrastructure. Information may also be disclosed where required by law or reasonably necessary to protect users, organisations, MUNACORE LIMITED, or the Service. Information within an organisation may be visible to authorised organisation users according to configured permissions.",
      list: [
        "Hosting",
        "Authentication",
        "Databases",
        "Storage",
        "Email",
        "Security",
        "Monitoring",
        "Infrastructure",
      ],
    },
    {
      number: 8,
      title: "Data Retention",
      content:
        "Information may be retained for as long as reasonably necessary to provide MEMBO, maintain security, meet legal obligations, resolve disputes, enforce agreements, or support legitimate operational requirements. Deleting a MEMBO account does not necessarily delete organisation-controlled records that the organisation is required or permitted to retain.",
      list: [
        "Provide MEMBO",
        "Maintain security",
        "Meet legal obligations",
        "Resolve disputes",
        "Enforce agreements",
        "Support legitimate operational requirements",
      ],
    },
    {
      number: 9,
      title: "Security",
      content:
        "MUNACORE LIMITED uses reasonable technical and organisational measures designed to protect personal information. No internet-based service can guarantee complete security. Users are responsible for protecting their account credentials.",
    },
    {
      number: 10,
      title: "International Transfers",
      content:
        "MEMBO may use infrastructure or service providers located outside Nigeria. Where personal information is transferred internationally, MUNACORE LIMITED will take reasonable steps to use appropriate safeguards where required by applicable law.",
    },
    {
      number: 11,
      title: "Privacy Rights",
      content: "Subject to applicable law, users may have rights to:",
      list: [
        "Request access to personal information",
        "Request correction",
        "Request deletion",
        "Request restriction of processing",
        "Object to certain processing",
        "Withdraw consent",
        "Request portability where applicable",
        "Lodge a complaint with a competent data-protection authority",
      ],
    },
    {
      number: 12,
      title: "Younger Users",
      content:
        "MEMBO may be used by younger users where an organisation has the appropriate authority, consent, authorisation, or other lawful basis. Organisations are responsible for complying with applicable requirements concerning children and younger users. MEMBO must not be used to circumvent child-protection or privacy requirements.",
    },
    {
      number: 13,
      title: "Cookies and Similar Technologies",
      content:
        "MEMBO may use cookies, local storage, session technologies, and similar mechanisms necessary for authentication, session management, security, preferences, and core functionality. If non-essential tracking technologies are introduced, appropriate notice and choices will be provided where legally required.",
      list: [
        "Authentication",
        "Session management",
        "Security",
        "Preferences",
        "Core functionality",
      ],
    },
    {
      number: 14,
      title: "Third-Party Services",
      content:
        "MEMBO may use third-party providers to support its infrastructure and functionality. These providers may process information on behalf of MUNACORE LIMITED where necessary to provide MEMBO. Third-party services independently operated by other companies may have separate privacy policies.",
    },
    {
      number: 15,
      title: "Changes to the Privacy Policy",
      content:
        "This Privacy Policy may be updated when MEMBO&apos;s practices, technology, legal obligations, or security requirements change. Material changes will receive reasonable notice where appropriate. The effective date identifies the current version.",
    },
    {
      number: 16,
      title: "Contact",
      content:
        "MEMBO is operated by MUNACORE LIMITED. A dedicated privacy/legal email address will be published when available.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0D0A1A]">
      {/* Background effects */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -right-32 top-20 h-100 w-100 rounded-full bg-[#6D28D9]/10 blur-[100px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 py-16 sm:px-10 lg:px-16">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#A78BFA] hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
        {/* Header */}
        <div className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-3 transition-opacity hover:opacity-80"
            aria-label="MEMBO home"
          >
            <Image
              src="/images/membo-t.png"
              alt="MEMBO"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="font-serif text-xl font-semibold tracking-tight text-white align-center">
              MEMBO
            </span>
          </Link>

          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>

          <p className="mt-4 text-sm text-white/40">
            Effective Date: September 2, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Intro card */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-[15px] leading-7 text-[#E8E5F2]">
              MEMBO is operated by{" "}
              <strong className="text-[#A78BFA]">MUNACORE LIMITED</strong>. This
              Privacy Policy explains how personal information is handled
              through MEMBO.
            </p>
          </section>

          {/* Section cards */}
          {sections.map((section) => (
            <section
              key={section.number}
              className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <h2 className="font-serif text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/20 text-[#A78BFA] text-sm font-bold">
                  {section.number}
                </span>
                {section.title}
              </h2>
              <div className="text-[15px] leading-7 text-[#AAA5BA] space-y-3">
                {section.subsections ? (
                  <div className="space-y-4">
                    {section.subsections.map((subsection, idx) => (
                      <div key={idx}>
                        {subsection.subtitle && (
                          <h3 className="font-semibold text-white pt-2">
                            {subsection.subtitle}
                          </h3>
                        )}
                        {subsection.intro && <p>{subsection.intro}</p>}
                        {subsection.content && <p>{subsection.content}</p>}
                        {subsection.items && (
                          <ul className="list-disc pl-6 space-y-1">
                            {subsection.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <p>{section.content}</p>
                    {section.list && (
                      <ul className="list-disc pl-6 space-y-1">
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-sm text-white/30">
            © 2026 MUNACORE LIMITED. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}
