import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GroupsPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || id === "undefined") {
    redirect("/dashboard/organizations");
  }

  redirect(`/dashboard/organizations/${id}?tab=groups`);
}

