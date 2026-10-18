import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../types";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth треба використовувати всередині AuthProvider");
  }
  return ctx;
}
