import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function PublicOnlyRoute() {
  const { loading, session, role } = useAuth();
  if (loading) return null;
  if (session) {
    const dest = role === "admin" ? "/dashboard" : role === "cleaner" ? "/cleaner-dashboard" : "/client-dashboard";
    return <Navigate to={dest} replace />;
  }
  return <Outlet />;
}
