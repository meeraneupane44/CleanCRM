"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Role = "admin" | "cleaner" | "client" | null;

type AuthCtx = {
  loading: boolean;
  session: import("@supabase/supabase-js").Session | null;
  user: import("@supabase/supabase-js").User | null;
  role: Role;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [role, setRole] = useState<Role>(null);

  const user = session?.user ?? null;

  const refreshProfile = async () => {
    if (!user) {
      setRole(null);
      return;
    }
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    setRole((data?.role as Role) ?? null);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // profile may change after sign-in or password reset link
      refreshProfile().catch(() => {});
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { refreshProfile().catch(() => {}); }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const value = useMemo<AuthCtx>(() => ({
    loading,
    session,
    user,
    role,
    refreshProfile,
    signOut,
  }), [loading, session, user, role]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
