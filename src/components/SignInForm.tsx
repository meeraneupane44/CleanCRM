"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // Get role from public.users table
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    if (!userData) {
      setErrorMsg("User role not found.");
      setLoading(false);
      return;
    }

    // Redirect based on role
    if (userData.role === "admin") {
      navigate("/admin-dashboard");
    } else if (userData.role === "cleaner") {
      navigate("/cleaner-dashboard");
    } else {
      navigate("/client-dashboard");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSignIn} className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold">Sign In</h2>

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-2 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
    </form>
  );
}
