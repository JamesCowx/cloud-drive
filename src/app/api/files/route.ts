import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listDrive, folderBelongsToUser, uniqueName } from "@/lib/drive";
import { resolveStorageKey } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folder = request.nextUrl.searchParams.get("folder") ?? "";
  const query = request.nextUrl.searchParams.get("q") ?? undefined;

  const folderId = folder && folder !== "root" ? folder : null;
  if (folderId && !(await folderBelongsToUser(session.userId, folderId))) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const listing = await listDrive(session.userId, folderId, query);
  return NextResponse.json(listing);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") ?? "upload";

  if (action === "createFolder") {
    const body = await request.json().catch(() => null);
    const name = body?.name?.trim() ?? "New folder";
    const parentId = body?.parentId ?? null;

    if (parentId && !(await folderBelongsToUser(session.userId, parentId))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    const finalName = await uniqueName(
      session.userId,
      parentId,
      name,
      true,
    );
    const folder = await prisma.file.create({
      data: {
        name: finalName,
        isFolder: true,
        userId: session.userId,
        parentId,
      },
      select: { id: true, name: true },
    });
    return NextResponse.json({ folder }, { status: 201 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const parentId = form.get("parentId");
  const parent = parentId === null ? null : String(parentId);
  if (parent && !(await folderBelongsToUser(session.userId, parent))) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const created = [];

  for (const file of files) {
    const storageKey = `${randomUUID()}__${file.name.replace(/[\\/]/g, "_")}`;
    const finalName = await uniqueName(
      session.userId,
      parent,
      file.name,
      false,
    );
    const size = file.size;

    await pipeline(
      file.stream() as unknown as NodeJS.ReadableStream,
      createWriteStream(resolveStorageKey(session.userId, storageKey)),
    );

    const record = await prisma.file.create({
      data: {
        name: finalName,
        isFolder: false,
        mimeType: file.type || null,
        size: BigInt(size),
        storageKey,
        userId: session.userId,
        parentId: parent,
      },
      select: { id: true, name: true, size: true },
    });
    created.push(record);
  }

  return NextResponse.json({ files: created }, { status: 201 });
}
