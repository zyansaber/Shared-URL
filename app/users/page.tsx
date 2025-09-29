// app/users/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import UsersManager from "@/components/UsersManager";

export default async function UsersPage() {
  const session: any = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  return <UsersManager />;
}
