import { supabase } from "@/lib/supabase";

export const insertUserRole = async (id: string, role: string) => {
  return await supabase.from("users").insert([{ id, role }]);
};
