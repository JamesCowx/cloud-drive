import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate, fileExtension } from "@/lib/format";
import { CloudIcon, DownloadIcon, FileIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const share = await prisma.share.findUnique({
    where: { token },
    select: { file: { select: { name: true } } },
  });
  return { title: share ? `${share.file.name} | Cloud Drive` : "Cloud Drive" };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await prisma.share.findUnique({
    where: { token },
    select: {
      file: {
        select: {
          name: true,
          size: true,
          isFolder: true,
          mimeType: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!share || share.file.isFolder) {
    notFound();
  }

  const file = share.file;
  const ext = fileExtension(file.name);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-2xl font-semibold">
          <CloudIcon className="h-8 w-8 text-blue-600" />
          Cloud Drive
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
              <FileIcon
                className={`h-6 w-6 ${
                  ext === "pdf"
                    ? "text-red-500"
                    : ext === "zip" || ext === "rar" || ext === "7z"
                      ? "text-amber-600"
                      : "text-zinc-400"
                }`}
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">{file.name}</h1>
              <p className="text-sm text-zinc-500">
                {formatBytes(Number(file.size))} · Updated{" "}
                {formatDate(file.updatedAt)}
              </p>
            </div>
          </div>
          <a
            href={`/api/shares/${token}/download`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <DownloadIcon className="h-4 w-4" />
            Download file
          </a>
          <p className="mt-3 text-center text-xs text-zinc-400">
            Shared via Cloud Drive
          </p>
        </div>
      </div>
    </div>
  );
}
