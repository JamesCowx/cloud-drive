import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listDrive, folderBelongsToUser, uniqueName } from "@/lib/drive";
import { resolveStorageKey } from "@/lib/storage";

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 100 * 1024 * 1024);

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif",
  "sh", "bash", "csh", "ksh",
  "php", "jsp", "asp", "aspx", "cgi", "pl",
  "dll", "so", "dylib", "sys", "vxd",
  "vbs", "vbe", "wsf", "wsh", "ps1", "psm1",
]);

function isBlockedFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

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
    const name = (body?.name?.trim() ?? "New folder").slice(0, 200);
    const parentId = body?.parentId ?? null;

    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
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

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" exceeds the ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit` },
        { status: 413 },
      );
    }
    if (isBlockedFile(file.name)) {
      return NextResponse.json(
        { error: `"${file.name}" has a blocked file type` },
        { status: 400 },
      );
    }
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
      select: { id: true, name: true },
    });
    created.push(record);
  }

  return NextResponse.json({ files: created }, { status: 201 });
}
