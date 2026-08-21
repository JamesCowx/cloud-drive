import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { resolveStorageKey } from "@/lib/storage";

type Params = { params: Promise<{ token: string }> };

function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii.replace(/"/g, "'")}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const share = await prisma.share.findUnique({
    where: { token },
    select: {
      file: {
        select: {
          name: true,
          mimeType: true,
          size: true,
          storageKey: true,
          userId: true,
        },
      },
    },
  });
  if (!share || !share.file.storageKey) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const { storageKey, userId, name, mimeType, size } = share.file;
  const filePath = resolveStorageKey(userId, storageKey);
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": mimeType ?? "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": contentDisposition(name),
      "Cache-Control": "private, no-store",
    },
  });
}
