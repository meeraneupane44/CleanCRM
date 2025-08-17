import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="w-full max-w-[420px] bg-white rounded-xl shadow-sm border p-6">
        {children}
      </div>
    </div>
  );
}
