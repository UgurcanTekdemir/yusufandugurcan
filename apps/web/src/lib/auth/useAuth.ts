"use client";

import { useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

/**
 * React hook for client components to access Firebase Auth state
 * Returns the current user, loading state, and error
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, []);

  return { user, loading, error };
}

/**
 * React hook that requires authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(): UseAuthReturn & { user: User } {
  const { user, loading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !error) {
      router.push("/login");
    }
  }, [user, loading, error, router]);

  if (!user) {
    return { user: null as unknown as User, loading, error };
  }

  return { user, loading, error };
}
