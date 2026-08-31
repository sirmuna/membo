"use client";

import { useRouter } from "next/navigation";
import { SettingsTab } from "./settings-tab";

interface OrgSettingsPageProps {
  organisationId: string;
  organisationData: any;
  userRole: string;
}

export function OrgSettingsPage({
  organisationId,
  organisationData,
  userRole,
}: OrgSettingsPageProps) {
  const router = useRouter();

  return (
    <SettingsTab
      organisationId={organisationId}
      organisationData={organisationData}
      userRole={userRole}
      onUpdate={() => router.refresh()}
    />
  );
}
