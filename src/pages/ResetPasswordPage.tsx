"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/auth/AuthLayout";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Supabase will open this route with a session (from the magic link)
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    setMsg(error ? error.message : "Password changed. You can close this tab and sign in.");
    setLoading(false);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleReset} className="space-y-4">
        <h1 className="text-2xl font-bold">Set New Password</h1>
        <input className="w-full border p-2 rounded" placeholder="New password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? "Saving..." : "Save Password"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </AuthLayout>
  );
}
