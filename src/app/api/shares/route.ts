import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fileId = body?.fileId;
  if (typeof fileId !== "string") {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  const record = await prisma.file.findFirst({
    where: { id: fileId, userId: session.userId, isFolder: false },
    select: { id: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const share = await prisma.share.create({
    data: { fileId, token: randomUUID(), userId: session.userId },
    select: { token: true },
  });

  return NextResponse.json({ share }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const share = await prisma.share.findFirst({
    where: { token },
    select: { id: true, file: { select: { userId: true } } },
  });
  if (!share || share.file.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.share.delete({ where: { id: share.id } });
  return NextResponse.json({ ok: true });
}
