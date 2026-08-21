import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectDescendantFiles } from "@/lib/drive";
import { deleteUpload } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.file.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  if (!name || name.length > 200) {
    return NextResponse.json(
      { error: "Name must be 1-200 characters" },
      { status: 400 },
    );
  }

  const current = await prisma.file.findUnique({
    where: { id },
    select: { parentId: true },
  });
  const duplicate = await prisma.file.findFirst({
    where: {
      userId: session.userId,
      parentId: current?.parentId ?? null,
      name,
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "An item with that name already exists here" },
      { status: 409 },
    );
  }

  const updated = await prisma.file.update({
    where: { id },
    data: { name },
    select: { id: true, name: true },
  });
  return NextResponse.json({ file: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.file.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, isFolder: true, storageKey: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const keysToDelete: (string | null)[] = [record.storageKey];
  if (record.isFolder) {
    const descendants = await collectDescendantFiles(session.userId, id);
    for (const d of descendants) keysToDelete.push(d.storageKey);
  }

  await prisma.file.delete({ where: { id } });
  for (const key of keysToDelete) {
    if (key) {
      await deleteUpload(session.userId, key).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
