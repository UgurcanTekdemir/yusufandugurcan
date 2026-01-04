/**
 * User role type for RBAC
 */
export type Role = "superadmin" | "dealer" | "user";

/**
 * User custom claims interface
 */
export interface UserClaims {
  role: Role;
  dealerId?: string;
}
