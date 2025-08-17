"use client";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/auth/AuthLayout";

export default function SignInPage() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMsg(error.message); setLoading(false); return; }

    const { data: userData } = await supabase.from("users").select("role").eq("id", data.user?.id).single();
    const role = userData?.role;
    if (role === "admin") navigate("/dashboard", { replace: true });
    else if (role === "cleaner") navigate("/cleaner-dashboard", { replace: true });
    else navigate("/client-dashboard", { replace: true });
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSignIn} className="space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <div className="flex justify-between text-sm">
          <Link to="/signup" className="text-blue-600">Create account</Link>
          <Link to="/forgot-password" className="text-blue-600">Forgot password?</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
