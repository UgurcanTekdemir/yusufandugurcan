import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";

export default async function HomePage() {
  // Check if user is authenticated
  const user = await getServerAuthUser();
  
  if (!user) {
    redirect("/login");
  }

  // Redirect to fixtures page (main sportsbook view)
  redirect("/fixtures");
}

