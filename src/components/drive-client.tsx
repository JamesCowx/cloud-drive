"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DriveListing, FileItem } from "@/lib/drive";
import { formatBytes, formatDate, fileExtension } from "@/lib/format";
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  MoreIcon,
  PlusIcon,
  RenameIcon,
  SearchIcon,
  ShareIcon,
  TrashIcon,
  UploadIcon,
  CloseIcon,
  LinkIcon,
  CheckIcon,
} from "@/lib/icons";

type MenuState =
  | { type: "rename"; item: FileItem }
  | { type: "delete"; item: FileItem }
  | { type: "share"; item: FileItem }
  | { type: "newFolder" }
  | null;

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
  xls: { bg: "bg-green-100", text: "text-green-600" },
  xlsx: { bg: "bg-green-100", text: "text-green-600" },
  ppt: { bg: "bg-orange-100", text: "text-orange-600" },
  pptx: { bg: "bg-orange-100", text: "text-orange-600" },
  zip: { bg: "bg-amber-100", text: "text-amber-700" },
  rar: { bg: "bg-amber-100", text: "text-amber-700" },
  "7z": { bg: "bg-amber-100", text: "text-amber-700" },
  tar: { bg: "bg-amber-100", text: "text-amber-700" },
  gz: { bg: "bg-amber-100", text: "text-amber-700" },
  mp3: { bg: "bg-purple-100", text: "text-purple-600" },
  wav: { bg: "bg-purple-100", text: "text-purple-600" },
  mp4: { bg: "bg-purple-100", text: "text-purple-600" },
  mov: { bg: "bg-purple-100", text: "text-purple-600" },
  mkv: { bg: "bg-purple-100", text: "text-purple-600" },
  avi: { bg: "bg-purple-100", text: "text-purple-600" },
  js: { bg: "bg-yellow-100", text: "text-yellow-700" },
  ts: { bg: "bg-blue-100", text: "text-blue-600" },
  py: { bg: "bg-blue-100", text: "text-blue-600" },
  json: { bg: "bg-zinc-100", text: "text-zinc-600" },
  md: { bg: "bg-zinc-100", text: "text-zinc-600" },
  txt: { bg: "bg-zinc-100", text: "text-zinc-600" },
  csv: { bg: "bg-green-100", text: "text-green-600" },
  html: { bg: "bg-orange-100", text: "text-orange-600" },
  css: { bg: "bg-blue-100", text: "text-blue-600" },
};

function FileBadge({ name, isFolder }: { name: string; isFolder: boolean }) {
  if (isFolder) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
        <FolderIcon className="h-5 w-5 text-amber-600" />
      </div>
    );
  }
  const ext = fileExtension(name);
  const colors = EXT_COLORS[ext];
  if (colors) {
    return (
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}
      >
        <span className={`text-xs font-bold uppercase ${colors.text}`}>
          {ext.slice(0, 4)}
        </span>
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
      <FileIcon className="h-5 w-5 text-zinc-400" />
    </div>
  );
}

export function DriveClient({ initial }: { initial: DriveListing }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [crumbs, setCrumbs] = useState(initial.crumbs);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<MenuState>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setBusy(`Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`);
    setError(null);
    const form = new FormData();
    for (const file of files) form.append("files", file);
    if (initial.currentFolder) {
      form.append("parentId", initial.currentFolder);
    }
    try {
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragover(false);
    const dropped = Array.from(event.dataTransfer.files);
    void uploadFiles(dropped);
  }

  function runSearch(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setQuery(value);
    const q = value.trim();
    if (!q) {
      setSearching(false);
      refresh();
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/files?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as DriveListing;
        if (!res.ok) throw new Error("Search failed");
        setItems(data.items);
        setCrumbs([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function createFolder(name: string) {
    setBusy("Creating folder...");
    setError(null);
    try {
      const res = await fetch("/api/files?action=createFolder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: initial.currentFolder,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setBusy(null);
    }
  }

  async function renameItem(item: FileItem, name: string) {
    setBusy("Renaming...");
    setError(null);
    try {
      const res = await fetch(`/api/files/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteItem(item: FileItem) {
    setBusy("Deleting...");
    setError(null);
    try {
      const res = await fetch(`/api/files/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function createShare(item: FileItem): Promise<string> {
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: item.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Share failed");
    return data.share.token as string;
  }

  async function revokeShare(token: string) {
    setBusy("Revoking link...");
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(null);
    }
  }

  function download(item: FileItem) {
    window.location.href = `/api/files/${item.id}/download`;
  }

  function openFolder(item: FileItem) {
    router.push(`/files/${item.id}`);
  }

  function rowClick(item: FileItem) {
    if (item.isFolder) openFolder(item);
    else download(item);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuFor(null);
        setModal(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const isSearching = query.trim().length > 0;
  const empty = items.length === 0;

  return (
    <div
      className={`relative rounded-2xl border bg-white shadow-sm transition-colors ${
        dragover
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-zinc-200"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragover) setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={onDrop}
    >
      {dragover && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-blue-50/90 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-white/80 px-12 py-10 text-center shadow-lg">
            <UploadIcon className="mx-auto mb-3 h-12 w-12 text-blue-500" />
            <p className="text-lg font-semibold text-blue-900">
              Drop files to upload
            </p>
            <p className="mt-1 text-sm text-blue-500">
              Files will be added to the current folder
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search your files..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
            </div>
          )}
          {isSearching && !searching && (
            <button
              onClick={() => {
                setQuery("");
                refresh();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ type: "newFolder" })}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 active:bg-zinc-100"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">New folder</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            <UploadIcon className="h-4 w-4" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              void uploadFiles(files);
            }}
          />
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-0.5 px-4 pt-3 text-sm">
        {isSearching ? (
          <span className="flex items-center gap-1.5 text-zinc-500">
            <SearchIcon className="h-3.5 w-3.5" />
            Results for{" "}
            <span className="font-medium text-zinc-900">
              &ldquo;{query.trim()}&rdquo;
            </span>
            <span className="ml-1 text-xs text-zinc-400">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </span>
        ) : (
          <>
            <Link
              href="/files"
              className="rounded-md px-2 py-1 font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              My files
            </Link>
            {crumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-0.5">
                <span className="text-zinc-300">/</span>
                <Link
                  href={`/files/${crumb.id}`}
                  className="rounded-md px-2 py-1 font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {crumb.name}
                </Link>
              </span>
            ))}
          </>
        )}
      </nav>

      {busy && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
          {busy}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 rounded p-0.5 hover:bg-red-100"
            aria-label="Dismiss"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="p-4">
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 py-16 text-center">
            {isSearching ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100">
                  <SearchIcon className="h-8 w-8 text-zinc-300" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600">No results found</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Try a different search term
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <UploadIcon className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600">
                    This folder is empty
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Drag &amp; drop files here or click Upload
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <UploadIcon className="h-4 w-4" />
                  Upload files
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li
                key={item.id}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => rowClick(item)}
                >
                  <FileBadge name={item.name} isFolder={item.isFolder} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {item.isFolder
                        ? "Folder"
                        : formatBytes(item.size)}
                      {" · "}
                      {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </button>
                {item.shareToken && (
                  <span className="hidden shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 sm:flex">
                    <LinkIcon className="h-3 w-3" />
                    Shared
                  </span>
                )}
                <div className="relative shrink-0">
                  <button
                    onClick={() =>
                      setMenuFor(menuFor === item.id ? null : item.id)
                    }
                    className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100"
                    aria-label={`Actions for ${item.name}`}
                  >
                    <MoreIcon className="h-4 w-4" />
                  </button>
                  {menuFor === item.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
                      {!item.isFolder && (
                        <>
                          <button
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                            onClick={() => download(item)}
                          >
                            <DownloadIcon className="h-4 w-4 text-zinc-400" />
                            Download
                          </button>
                          <button
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                            onClick={() => setModal({ type: "share", item })}
                          >
                            <ShareIcon className="h-4 w-4 text-zinc-400" />
                            Share link
                          </button>
                          <div className="my-1 border-t border-zinc-100" />
                        </>
                      )}
                      <button
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                        onClick={() => setModal({ type: "rename", item })}
                      >
                        <RenameIcon className="h-4 w-4 text-zinc-400" />
                        Rename
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                        onClick={() => setModal({ type: "delete", item })}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal?.type === "newFolder" && (
        <NameModal
          title="New folder"
          initialValue="New folder"
          submitLabel="Create"
          onSubmit={(name) => {
            void createFolder(name);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "rename" && (
        <NameModal
          title={`Rename ${modal.item.isFolder ? "folder" : "file"}`}
          initialValue={modal.item.name}
          submitLabel="Rename"
          onSubmit={(name) => {
            void renameItem(modal.item, name);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <ConfirmModal
          title={modal.item.isFolder ? "Delete folder?" : "Delete file?"}
          message={`"${modal.item.name}" will be permanently deleted. This cannot be undone.`}
          submitLabel="Delete"
          danger
          onSubmit={() => {
            void deleteItem(modal.item);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "share" && (
        <ShareModal
          item={modal.item}
          onCreate={() => createShare(modal.item)}
          onRevoke={(token) => {
            void revokeShare(token);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function NameModal({
  title,
  initialValue,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  initialValue: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <ModalShell onClose={onClose}>
      <h2 className="mb-3 text-lg font-semibold text-zinc-900">{title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = value.trim();
          if (name) onSubmit(name);
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  message,
  submitLabel,
  danger,
  onSubmit,
  onClose,
}: {
  title: string;
  message: string;
  submitLabel: string;
  danger?: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start gap-3">
        {danger && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <TrashIcon className="h-5 w-5 text-red-600" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{message}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function ShareModal({
  item,
  onCreate,
  onRevoke,
  onClose,
}: {
  item: FileItem;
  onCreate: () => Promise<string>;
  onRevoke: (token: string) => void;
  onClose: () => void;
}) {
  const [token, setToken] = useState<string | null>(item.shareToken);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = token ? `${window.location.origin}/s/${token}` : null;

  async function makeLink() {
    setCreating(true);
    setError(null);
    try {
      const newToken = await onCreate();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setCreating(false);
    }
  }

  function copy() {
    if (!link) return;
    void navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <ShareIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Share file</h2>
          <p className="text-sm text-zinc-500">{item.name}</p>
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {link ? (
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-zinc-500">
            Share link
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
            <button
              onClick={copy}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Anyone with this link can download the file
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          Create a shareable link so anyone can download this file.
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
        >
          Close
        </button>
        {link ? (
          <button
            onClick={() => {
              onRevoke(token!);
              onClose();
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Revoke link
          </button>
        ) : (
          <button
            onClick={() => void makeLink()}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </>
            ) : (
              "Create link"
            )}
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
