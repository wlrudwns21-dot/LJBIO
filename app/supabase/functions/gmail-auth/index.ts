// Supabase Edge Function: gmail-auth
// Keeps a user's Gmail connection alive by securely storing their Google
// refresh token and minting fresh access tokens on demand (the client secret
// never leaves the server).
//
// Deploy:
//   supabase functions deploy gmail-auth --no-verify-jwt=false
// Secrets to set (Supabase → Edge Functions → gmail-auth → Secrets, or CLI
//   `supabase secrets set`):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Actions (POST JSON body):
//   { action: "connect", refresh_token }  → store the user's refresh token
//   { action: "refresh" }                 → { access_token, email }
//   { action: "disconnect" }              → remove the stored token

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Identify the caller from their Supabase JWT.
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "connect") {
      if (!body.refresh_token) return json({ error: "no refresh_token" }, 400);
      const { error } = await admin.from("gmail_accounts").upsert({
        user_id: user.id,
        email: user.email,
        refresh_token: body.refresh_token,
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "disconnect") {
      await admin.from("gmail_accounts").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    if (action === "refresh") {
      const { data: row } = await admin
        .from("gmail_accounts")
        .select("refresh_token,email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row?.refresh_token) return json({ error: "not_connected" }, 404);

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: row.refresh_token,
        grant_type: "refresh_token",
      });
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const tok = await r.json();
      if (!tok.access_token) {
        // refresh token revoked/expired → forget it so the user reconnects
        if (tok.error === "invalid_grant") {
          await admin.from("gmail_accounts").delete().eq("user_id", user.id);
        }
        return json({ error: "refresh_failed", detail: tok }, 400);
      }
      return json({ access_token: tok.access_token, email: row.email });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
