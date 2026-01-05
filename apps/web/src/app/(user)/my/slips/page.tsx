import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { listUserSlips } from "@/server/services/slipService";
import type { Role } from "@/features/rbac/types";
import { MySlipsClient } from "./MySlipsClient";

export default async function MySlipsPage() {
  // Get authenticated user and validate user role
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;

  // Validate user role (must be 'user' or redirect)
  if (userRole !== "user") {
    redirect("/");
  }

  // Get user's slips
  const slips = await listUserSlips(user.uid);

  return <MySlipsClient slips={slips} />;
}
