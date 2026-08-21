import { listDrive } from "@/lib/drive";
import { getSession } from "@/lib/auth";
import { DriveClient } from "@/components/drive-client";

export const dynamic = "force-dynamic";

export default async function FilesRootPage() {
  const session = await getSession();
  const listing = await listDrive(session!.userId, null);
  return <DriveClient initial={listing} />;
}
