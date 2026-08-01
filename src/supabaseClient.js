import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// .envが未設定でもアプリ自体は起動できるようにしておく（メンバー共有機能だけ無効になる）
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
