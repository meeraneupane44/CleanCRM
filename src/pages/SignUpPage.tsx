"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthLayout from "@/auth/AuthLayout";

export default function SignUpPage() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin"|"cleaner">("cleaner");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg("");
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone, role } } // stored in auth.user.user_metadata
    });
    if (error) { setMsg(`Signup error: ${error.message}`); setLoading(false); return; }

    // Create row in public.users (if you don't already have an auth trigger)
    // If you use the recommended trigger below, you can skip this insert.
    await supabase.from("users").upsert({
      id: data.user?.id,
      email, name, phone, role
    }, { onConflict: "id" });

    setMsg("Signup successful! Check your email to confirm.");
    setLoading(false);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <input className="w-full border p-2 rounded" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} required/>
        <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className="w-full border p-2 rounded" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <input className="w-full border p-2 rounded" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)}/>
        <select className="w-full border p-2 rounded" value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="cleaner">Cleaner</option>
          <option value="admin">Admin</option>
        </select>
        <button className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </AuthLayout>
  );
}
