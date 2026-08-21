import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in | Cloud Drive" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/files");
  return <AuthForm mode="login" />;
}
