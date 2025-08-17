import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ requireRole }: { requireRole?: "admin" | "cleaner" | "client" }) {
  const { loading, session, role } = useAuth();
  if (loading) return null; // or a spinner
  if (!session) return <Navigate to="/signin" replace />;
  if (requireRole && role && role !== requireRole) {
    // you can route by role here
    const fallback = role === "admin" ? "/dashboard" : role === "cleaner" ? "/cleaner-dashboard" : "/client-dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
}
