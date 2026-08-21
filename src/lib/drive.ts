import { prisma } from "@/lib/prisma";

export interface FileItem {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string | null;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  shareToken: string | null;
}

export interface FolderCrumb {
  id: string;
  name: string;
}

export interface DriveListing {
  items: FileItem[];
  crumbs: FolderCrumb[];
  currentFolder: string | null;
  query: string | null;
}

function toFileItem(record: {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string | null;
  size: bigint;
  createdAt: Date;
  updatedAt: Date;
  shares: { token: string }[];
}): FileItem {
  return {
    id: record.id,
    name: record.name,
    isFolder: record.isFolder,
    mimeType: record.mimeType,
    size: Number(record.size),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    shareToken: record.shares[0]?.token ?? null,
  };
}

export async function getCrumbs(
  userId: string,
  folderId: string | null,
): Promise<FolderCrumb[]> {
  const crumbs: FolderCrumb[] = [];
  let currentId = folderId;
  let guard = 0;
  while (currentId && guard++ < 64) {
    const folder = await prisma.file.findFirst({
      where: { id: currentId, userId, isFolder: true },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return crumbs;
}

export async function listDrive(
  userId: string,
  folderId: string | null,
  query?: string,
): Promise<DriveListing> {
  const q = query?.trim();
  if (q) {
    const hits = await prisma.file.findMany({
      where: {
        userId,
        name: { contains: q, mode: "insensitive" },
      },
      orderBy: [{ isFolder: "desc" }, { name: "asc" }],
      include: { shares: { select: { token: true } } },
      take: 200,
    });
    return { items: hits.map(toFileItem), crumbs: [], currentFolder: null, query: q };
  }

  const items = await prisma.file.findMany({
    where: { userId, parentId: folderId },
    orderBy: [{ isFolder: "desc" }, { name: "asc" }],
    include: { shares: { select: { token: true } } },
  });
  const crumbs = await getCrumbs(userId, folderId);
  return {
    items: items.map(toFileItem),
    crumbs,
    currentFolder: folderId,
    query: null,
  };
}

export async function folderBelongsToUser(
  userId: string,
  folderId: string,
): Promise<boolean> {
  const folder = await prisma.file.findFirst({
    where: { id: folderId, userId, isFolder: true },
    select: { id: true },
  });
  return folder !== null;
}

export async function uniqueName(
  userId: string,
  parentId: string | null,
  desiredName: string,
  isFolder: boolean,
): Promise<string> {
  const baseName = desiredName.trim() || (isFolder ? "New folder" : "Untitled");
  const dot = isFolder ? -1 : baseName.lastIndexOf(".");
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : "";

  let candidate = baseName;
  let n = 1;
  for (;;) {
    const exists = await prisma.file.findFirst({
      where: { userId, parentId, name: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
}

export async function collectDescendantFiles(
  userId: string,
  rootId: string,
): Promise<{ id: string; storageKey: string | null }[]> {
  const results: { id: string; storageKey: string | null }[] = [];
  const pending = [rootId];
  let guard = 0;
  while (pending.length > 0 && guard++ < 100_000) {
    const id = pending.shift()!;
    const children = await prisma.file.findMany({
      where: { parentId: id },
      select: { id: true, isFolder: true, storageKey: true },
    });
    for (const child of children) {
      if (child.isFolder) {
        pending.push(child.id);
      } else {
        results.push({ id: child.id, storageKey: child.storageKey });
      }
    }
  }
  return results;
}
