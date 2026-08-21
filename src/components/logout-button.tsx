"use client";

import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/lib/icons";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
      title="Sign out"
    >
      <LogoutIcon className="h-4 w-4" />
      Sign out
    </button>
  );
}
