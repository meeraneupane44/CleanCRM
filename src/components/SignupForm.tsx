"use client";
import { useState } from "react";
import { signUp } from "@/utils/auth";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "cleaner">("cleaner");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await signUp(email, password, name, phone, role);

    if (error) {
      setMessage(`Signup error: ${error.message}`);
    } else {
      setMessage("Signup successful! Check your email for confirmation.");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold">Sign Up</h2>

      <input
        type="text"
        placeholder="Full Name"
        className="w-full border p-2 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

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

      <input
        type="tel"
        placeholder="Phone Number"
        className="w-full border p-2 rounded"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "admin" | "cleaner")}
        className="w-full border p-2 rounded"
      >
        <option value="cleaner">Cleaner</option>
        <option value="admin">Admin</option>
      </select>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Signing up..." : "Sign Up"}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  );
}
