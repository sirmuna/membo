"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  const router = useRouter();

  const sections = [
    {
      number: 1,
      title: "Acceptance",
      content:
        "By creating an account, accessing MEMBO, joining an organisation, or using the Service, you agree to the Terms of Service. If you access MEMBO on behalf of an organisation, you represent that you have authority to bind that organisation to the Terms.",
    },
    {
      number: 2,
      title: "About MEMBO",
      content:
        "MEMBO is an organisation-management platform that enables organisations to manage members, organisation memberships, groups, attendance, dues, notifications, roles and permissions, and other organisational information and operations. MEMBO accounts are independent from organisations. Access to an organisation is determined by membership, role, and permissions.",
      list: [
        "Members",
        "Organisation memberships",
        "Groups",
        "Attendance",
        "Dues",
        "Notifications",
        "Roles and permissions",
        "Other organisational information and operations",
      ],
    },
    {
      number: 3,
      title: "Eligibility",
      content:
        "MEMBO may be used by younger users where the relevant organisation has the appropriate legal authority, consent, authorisation, or other safeguards required by applicable law. Organisations are responsible for ensuring that their use of MEMBO involving minors complies with applicable requirements.",
    },
    {
      number: 4,
      title: "MEMBO Accounts",
      content:
        "Users must provide accurate account information and protect their login credentials. Users must not:",
      list: [
        "Impersonate another person",
        "Use another person&apos;s account without authorisation",
        "Provide misleading account information",
        "Share credentials inappropriately",
        "Attempt to compromise another account",
      ],
    },
    {
      number: 5,
      title: "Organisations and Memberships",
      content:
        "Organisations operate independently within MEMBO. Organisation owners and administrators may invite users, approve or reject membership requests, assign roles, manage groups, configure permissions, manage organisation information, and remove or restrict members where authorised. A user&apos;s access may change when their organisation membership, role, or permissions change.",
      list: [
        "Invite users",
        "Approve or reject membership requests",
        "Assign roles",
        "Manage groups",
        "Configure permissions",
        "Manage organisation information",
        "Remove or restrict members where authorised",
      ],
    },
    {
      number: 6,
      title: "Organisation Data",
      content:
        "Organisations may store information including names, email addresses, member profiles, group memberships, attendance records, dues information, notifications, and other operational records. Organisation administrators are responsible for ensuring that they have the legal authority and appropriate basis to collect and process information about their members. They are also responsible for configuring MEMBO permissions appropriately.",
      list: [
        "Names",
        "Email addresses",
        "Member profiles",
        "Group memberships",
        "Attendance records",
        "Dues information",
        "Notifications",
        "Other operational records",
      ],
    },
    {
      number: 7,
      title: "Acceptable Use",
      content: "Users must not use MEMBO to:",
      list: [
        "Conduct unlawful activity",
        "Commit fraud or abuse",
        "Access unauthorised data",
        "Attack or disrupt MEMBO",
        "Upload malicious software",
        "Circumvent security controls",
        "Reverse engineer MEMBO where prohibited by law",
        "Violate another person&apos;s privacy or intellectual-property rights",
        "Circumvent applicable legal requirements",
      ],
    },
    {
      number: 8,
      title: "User Content",
      content:
        "Users and organisations retain rights in information they submit to MEMBO. They grant MUNACORE LIMITED the limited rights necessary to host, process, transmit, secure, maintain, and provide the MEMBO Service. Users and organisations are responsible for ensuring that they have the necessary rights and authority to submit information.",
    },
    {
      number: 9,
      title: "Service Availability",
      content:
        "MEMBO is provided on an ongoing development basis. MUNACORE LIMITED will make reasonable efforts to maintain availability but does not guarantee that MEMBO will always be available, error-free, uninterrupted, or completely secure. Features may be changed, improved, suspended, or discontinued when reasonably necessary.",
      list: ["Available", "Error-free", "Uninterrupted", "Completely secure"],
    },
    {
      number: 10,
      title: "Pricing",
      content:
        "MEMBO is currently provided as a free service. MUNACORE LIMITED may introduce Premium or paid features in the future. Any paid service will have applicable pricing, billing, cancellation, and refund terms presented before purchase.",
    },
    {
      number: 11,
      title: "Intellectual Property",
      content:
        "MEMBO&apos;s software, branding, interface, documentation, design, and underlying technology belong to or are licensed to MUNACORE LIMITED. Using MEMBO does not transfer ownership of the platform or its intellectual property to the user.",
    },
    {
      number: 12,
      title: "Third-Party Services",
      content:
        "MEMBO may depend on third-party providers for services such as hosting, authentication, database infrastructure, storage, email delivery, security, and monitoring. Third-party services may have their own terms and privacy policies.",
      list: [
        "Hosting",
        "Authentication",
        "Database infrastructure",
        "Storage",
        "Email delivery",
        "Security",
        "Monitoring",
      ],
    },
    {
      number: 13,
      title: "Security",
      content:
        "MUNACORE LIMITED uses reasonable technical and organisational measures to protect MEMBO and information processed through it. However, no online system can guarantee absolute security. Users and organisation administrators are responsible for maintaining appropriate access security.",
    },
    {
      number: 14,
      title: "Suspension and Termination",
      content:
        "Users may stop using MEMBO and may request account deletion. MUNACORE LIMITED may suspend or terminate access where reasonably necessary because of security risks, unlawful activity, abuse, material Terms violations, unauthorised access, or other circumstances permitted by law. Organisation administrators may independently manage a user&apos;s organisation membership and access.",
      list: [
        "Security risks",
        "Unlawful activity",
        "Abuse",
        "Material Terms violations",
        "Unauthorised access",
        "Other circumstances permitted by law",
      ],
    },
    {
      number: 15,
      title: "Disclaimers",
      content:
        "MEMBO is an organisational management tool and does not replace professional legal, financial, accounting, medical, compliance, or safeguarding advice. MEMBO is provided on &quot;as available&quot; and &quot;as is&quot; basis to the extent permitted by applicable law.",
      list: [
        "Legal advice",
        "Financial advice",
        "Accounting advice",
        "Medical advice",
        "Compliance advice",
        "Safeguarding advice",
      ],
    },
    {
      number: 16,
      title: "Limitation of Liability",
      content:
        "To the maximum extent permitted by applicable law, MUNACORE LIMITED will not be liable for indirect, incidental, consequential, special, or punitive damages arising from use of MEMBO. Nothing in the Terms excludes liability that cannot legally be excluded under Nigerian law.",
    },
    {
      number: 17,
      title: "Indemnification",
      content:
        "To the extent permitted by law, users agree to indemnify MUNACORE LIMITED against claims or losses arising from unlawful use of MEMBO, material violations of the Terms, or infringement of another person&apos;s rights.",
    },
    {
      number: 18,
      title: "Governing Law",
      content:
        "The Terms are governed by the laws of the Federal Republic of Nigeria. Applicable disputes will be subject to the jurisdiction of the appropriate courts in Nigeria.",
    },
    {
      number: 19,
      title: "Changes",
      content:
        "MUNACORE LIMITED may update the Terms when MEMBO, its business, security requirements, or applicable legal obligations change. Material changes will receive reasonable notice.",
    },
    {
      number: 20,
      title: "Contact",
      content:
        "MEMBO is operated by MUNACORE LIMITED. A dedicated legal contact email will be published when available.",
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
            <span className="font-serif text-xl font-semibold tracking-tight text-white">
              MEMBO
            </span>
          </Link>

          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Terms of Service
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
              MEMBO is a product of{" "}
              <strong className="text-[#A78BFA]">MUNACORE LIMITED</strong>. By
              creating an account, accessing MEMBO, joining an organisation, or
              using the Service, you agree to these Terms of Service.
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
                <p>{section.content}</p>
                {section.list && (
                  <ul className="list-disc pl-6 space-y-1">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
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
