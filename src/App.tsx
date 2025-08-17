import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

import Home from "./components/home";
import Scheduler from "./components/Scheduler";
import Clients from "./components/clients.tsx";
import Cleaners from "./components/cleaners";
import Sidebar from "./components/layout/Sidebar";

import SignupForm from "@/components/SignupForm";
import SignInForm from "@/components/SignInForm";

// 👇 if your file is "Authlayout.tsx", use that exact casing
import AuthLayout from "@/auth/AuthLayout"; // or "@/auth/Authlayout"

/* ---------- Small helpers ---------- */

// RequireAuth: renders children only when signed in; otherwise redirects to /login
function RequireAuth({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      setSession(newSession);
    });
    return () => {
      sub.subscription.unsubscribe();
      active = false;
    };
  }, []);

  if (loading) return null; // or a spinner
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// PublicOnly: if already signed in, send them into the app ("/"); else show auth pages
function PublicOnly() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      setSession(newSession);
    });
    return () => {
      sub.subscription.unsubscribe();
      active = false;
    };
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}

/* ---------- Layouts ---------- */

// App (protected) layout with your sidebar
function ProtectedAppLayout() {
  return (
    <RequireAuth>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-auto p-4">
          <Outlet />
        </div>
      </div>
    </RequireAuth>
  );
}

// Public auth layout (centered card)
function PublicAuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    </div>
  );
}

/* ---------- App ---------- */

const App = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Routes>
        {/* Public-only auth routes */}
        <Route element={<PublicOnly />}>
          <Route element={<PublicAuthLayout />}>
            <Route path="/login" element={<SignInForm />} />
            <Route path="/signup" element={<SignupForm />} />
          </Route>
        </Route>

        {/* Protected app routes (show sidebar) */}
        <Route element={<ProtectedAppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/cleaners" element={<Cleaners />} />
          <Route path="/clients" element={<Clients />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
