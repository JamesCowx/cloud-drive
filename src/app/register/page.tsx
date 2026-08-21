import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account | Cloud Drive" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/files");
  return <AuthForm mode="register" />;
}
