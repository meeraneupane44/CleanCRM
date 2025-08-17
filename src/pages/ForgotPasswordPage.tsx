"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/auth/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setMsg(error ? error.message : "Check your email for a reset link.");
    setLoading(false);
  };

  return (
    <AuthLayout>
      <form onSubmit={sendReset} className="space-y-4">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <button className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </AuthLayout>
  );
}
