import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both env vars are present. When false, the app runs in a
 *  read-only "demo" mode so the UI is still explorable without a backend. */
export const isSupabaseConfigured = Boolean(url && anon);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[LJ-BIO] Supabase env not set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Copy .env.example → .env and fill in your project keys. Running in demo mode.",
  );
}

// A harmless placeholder URL keeps createClient from throwing when unconfigured;
// any real call will fail fast, which the data hooks handle gracefully.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "public-anon-placeholder-key",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
