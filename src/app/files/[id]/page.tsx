import { notFound } from "next/navigation";
import { listDrive, folderBelongsToUser } from "@/lib/drive";
import { getSession } from "@/lib/auth";
import { DriveClient } from "@/components/drive-client";

export const dynamic = "force-dynamic";

export default async function FilesFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;

  if (!(await folderBelongsToUser(session!.userId, id))) {
    notFound();
  }

  const listing = await listDrive(session!.userId, id);
  return <DriveClient initial={listing} />;
}
