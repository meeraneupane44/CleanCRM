// src/utils/auth.ts
import { supabase } from "@/lib/supabase";

export async function signUp(
  email: string,
  password: string,
  name?: string,
  phone?: string,
  role?: "admin" | "cleaner"
) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        role,
      },
    },
  });
}
