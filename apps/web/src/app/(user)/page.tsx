import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to fixtures page (main sportsbook view)
  redirect("/fixtures");
}

