"use client";

import { useEffect, useState } from "react";
import { getIdTokenResult } from "firebase/auth";
import { useAuth } from "@/lib/auth/useAuth";
import type { Role, UserClaims } from "./types";

export interface UseRoleReturn {
  role: Role | null;
  dealerId: string | null;
  loading: boolean;
}

/**
 * React hook for client components to read custom claims from Firebase Auth
 * Returns the user's role and dealerId from custom claims
 */
export function useRole(): UseRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setRole(null);
      setDealerId(null);
      setLoading(false);
      return;
    }

    // Get ID token result to read custom claims
    getIdTokenResult(user, true)
      .then((tokenResult) => {
        const claims = tokenResult.claims as UserClaims;
        setRole(claims.role || null);
        setDealerId(claims.dealerId || null);
        setLoading(false);
      })
      .catch(() => {
        setRole(null);
        setDealerId(null);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { role, dealerId, loading: loading || authLoading };
}
