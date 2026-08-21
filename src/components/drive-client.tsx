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

function FileGlyph({ item }: { item: FileItem }) {
  if (item.isFolder) {
    return <FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />;
  }
  const ext = fileExtension(item.name);
  const color =
    ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "gif" || ext === "webp" || ext === "svg"
      ? "text-pink-500"
      : ext === "pdf"
        ? "text-red-500"
        : ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz"
          ? "text-amber-600"
          : ext === "mp3" || ext === "wav" || ext === "mp4" || ext === "mov" || ext === "mkv"
            ? "text-purple-500"
            : "text-zinc-400";
  return <FileIcon className={`h-5 w-5 shrink-0 ${color}`} />;
}

export function DriveClient({ initial }: { initial: DriveListing }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [crumbs, setCrumbs] = useState(initial.crumbs);
  const [query, setQuery] = useState("");
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
    setBusy(`Uploading ${files.length} file(s)...`);
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
    searchTimer.current = setTimeout(async () => {
      const q = value.trim();
      if (!q) {
        refresh();
        return;
      }
      try {
        const res = await fetch(`/api/files?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as DriveListing;
        if (!res.ok) throw new Error("Search failed");
        setItems(data.items);
        setCrumbs([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
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
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = query.trim().length > 0;
  const empty = items.length === 0;

  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${
        dragover ? "border-dashed border-blue-400 bg-blue-50/50" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragover) setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search your files..."
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal({ type: "newFolder" })}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50"
          >
            <PlusIcon className="h-4 w-4" />
            New folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
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

      <nav className="flex flex-wrap items-center gap-1 px-4 pt-3 text-sm">
        {searching ? (
          <span className="text-zinc-600">
            Results for <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span>
          </span>
        ) : (
          <>
            <Link
              href="/files"
              className="rounded px-1.5 py-0.5 font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              My files
            </Link>
            {crumbs.map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <span className="text-zinc-300">/</span>
                <Link
                  href={`/files/${crumb.id}`}
                  className="rounded px-1.5 py-0.5 font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  {crumb.name}
                </Link>
              </span>
            ))}
          </>
        )}
      </nav>

      {busy && (
        <div className="mx-4 mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
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
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-16 text-center">
            <UploadIcon className="h-10 w-10 text-zinc-300" />
            <p className="font-medium text-zinc-600">
              {searching ? "No results" : "This folder is empty"}
            </p>
            {!searching && (
              <p className="text-sm text-zinc-400">
                Upload files or create a folder to get started.
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li
                key={item.id}
                className="group relative flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-zinc-50"
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => rowClick(item)}
                >
                  <FileGlyph item={item} />
                  <span className="min-w-0 truncate text-sm font-medium">
                    {item.name}
                  </span>
                </button>
                <span className="w-20 shrink-0 text-right text-xs text-zinc-400">
                  {item.isFolder ? "—" : formatBytes(item.size)}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-xs text-zinc-400 sm:block">
                  {formatDate(item.updatedAt)}
                </span>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}
                    className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700"
                    aria-label={`Actions for ${item.name}`}
                  >
                    <MoreIcon className="h-4 w-4" />
                  </button>
                  {menuFor === item.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                      {!item.isFolder && (
                        <>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                            onClick={() => download(item)}
                          >
                            <DownloadIcon className="h-4 w-4 text-zinc-400" />
                            Download
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                            onClick={() => setModal({ type: "share", item })}
                          >
                            <ShareIcon className="h-4 w-4 text-zinc-400" />
                            Share link
                          </button>
                        </>
                      )}
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                        onClick={() => setModal({ type: "rename", item })}
                      >
                        <RenameIcon className="h-4 w-4 text-zinc-400" />
                        Rename
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
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
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
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
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
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
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <p className="text-sm text-zinc-500">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
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
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="mb-2 text-base font-semibold">Share &ldquo;{item.name}&rdquo;</h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {link ? (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-green-600" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="mb-3 text-sm text-zinc-500">
          Anyone with the link can download this file.
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create link"}
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
