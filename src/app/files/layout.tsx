import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CloudIcon } from "@/lib/icons";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5 font-semibold text-zinc-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <CloudIcon className="h-5 w-5 text-white" />
            </div>
            <span>Cloud Drive</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[200px] truncate text-sm text-zinc-500 sm:block">
              {session.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
