import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate, fileExtension } from "@/lib/format";
import { CloudIcon, DownloadIcon, FileIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

const EXT_COLORS: Record<string, { bg: string; text: string }> = {
  png: { bg: "bg-pink-100", text: "text-pink-600" },
  jpg: { bg: "bg-pink-100", text: "text-pink-600" },
  jpeg: { bg: "bg-pink-100", text: "text-pink-600" },
  gif: { bg: "bg-pink-100", text: "text-pink-600" },
  webp: { bg: "bg-pink-100", text: "text-pink-600" },
  svg: { bg: "bg-pink-100", text: "text-pink-600" },
  pdf: { bg: "bg-red-100", text: "text-red-600" },
  doc: { bg: "bg-blue-100", text: "text-blue-600" },
  docx: { bg: "bg-blue-100", text: "text-blue-600" },
  zip: { bg: "bg-amber-100", text: "text-amber-700" },
  rar: { bg: "bg-amber-100", text: "text-amber-700" },
  mp3: { bg: "bg-purple-100", text: "text-purple-600" },
  mp4: { bg: "bg-purple-100", text: "text-purple-600" },
  mov: { bg: "bg-purple-100", text: "text-purple-600" },
};

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
  const colors = EXT_COLORS[ext];

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center justify-center gap-2.5 text-2xl font-semibold text-white">
          <CloudIcon className="h-8 w-8 text-blue-500" />
          Cloud Drive
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-4">
            {colors ? (
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colors.bg}`}
              >
                <span className={`text-sm font-bold uppercase ${colors.text}`}>
                  {ext.slice(0, 4)}
                </span>
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-800">
                <FileIcon className="h-7 w-7 text-zinc-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-white">
                {file.name}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                {formatBytes(Number(file.size))}
                {" · "}
                {formatDate(file.updatedAt)}
              </p>
            </div>
          </div>
          <a
            href={`/api/shares/${token}/download`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 active:bg-blue-700"
          >
            <DownloadIcon className="h-5 w-5" />
            Download file
          </a>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Shared via Cloud Drive
          </p>
        </div>
      </div>
    </div>
  );
}
