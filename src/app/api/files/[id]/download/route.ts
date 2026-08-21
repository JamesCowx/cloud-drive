import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveStorageKey } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii.replace(/"/g, "'")}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.file.findFirst({
    where: { id, userId: session.userId, isFolder: false },
    select: { name: true, mimeType: true, size: true, storageKey: true },
  });
  if (!record || !record.storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = resolveStorageKey(session.userId, record.storageKey);
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": record.mimeType ?? "application/octet-stream",
      "Content-Length": String(record.size),
      "Content-Disposition": contentDisposition(record.name),
      "Cache-Control": "private, no-store",
    },
  });
}
