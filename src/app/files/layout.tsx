import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CloudIcon } from "@/lib/icons";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function FilesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <CloudIcon className="h-6 w-6 text-blue-600" />
            <span>Cloud Drive</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-500 sm:block">
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
