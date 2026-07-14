// Supabase Edge Function: mfds
// 식약처(MFDS) 공공데이터포털 OpenAPI 중계(프록시).
// - API 인증키(MFDS_API_KEY)를 서버에만 보관해 노출을 막고
// - 브라우저의 CORS 차단 없이 조회할 수 있게 합니다.
//
// Deploy: supabase functions deploy mfds
// Secrets: MFDS_API_KEY  (공공데이터포털 마이페이지의 일반 인증키)
//   ※ Encoding 키(%가 포함된 형태)든 Decoding 키든 모두 처리합니다.
//
// 요청(POST JSON): { path: "서비스명/오퍼레이션명", params: { item_name: "...", pageNo: 1 } }
// 응답: 공공데이터포털의 JSON을 그대로 전달(+ XML 오류는 메시지 추출)

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
    // 로그인한 직원만 사용 가능
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const rawKey = Deno.env.get("MFDS_API_KEY") ?? "";
    if (!rawKey)
      return json(
        { error: "MFDS_API_KEY가 설정되지 않았습니다. Supabase → Edge Functions → mfds → Secrets에 인증키를 등록하세요." },
        500,
      );
    // Encoding 키(% 포함)는 그대로, Decoding 키는 인코딩해서 사용
    const key = rawKey.includes("%") ? rawKey : encodeURIComponent(rawKey);

    const body = await req.json().catch(() => ({}));

    // ---- 연결 진단: 후보 주소들을 실제 호출해 상태·응답 원문을 반환 ----
    if (body?.diag && Array.isArray(body?.paths)) {
      const out: { path: string; status: number; body: string }[] = [];
      for (const p of (body.paths as string[]).slice(0, 10)) {
        if (!/^(\d{7}\/)?[A-Za-z0-9_]+\/[A-Za-z0-9_]+$/.test(String(p))) continue;
        const full = /^\d{7}\//.test(p) ? p : "1471000/" + p;
        try {
          const r = await fetch(
            `https://apis.data.go.kr/${full}?serviceKey=${key}&type=json&numOfRows=1&pageNo=1`,
          );
          const t = await r.text();
          out.push({ path: p, status: r.status, body: t.slice(0, 300) });
        } catch (e) {
          out.push({ path: p, status: 0, body: String((e as Error)?.message ?? e).slice(0, 200) });
        }
      }
      return json({ ok: true, diag: out });
    }

    let path = String(body?.path ?? "");
    // 허용 형식: "서비스/오퍼레이션"(식약처 기본) 또는 "기관코드/서비스/오퍼레이션"
    // (예: 공정거래위원회 리콜 = 1130000/...)
    if (!/^(\d{7}\/)?[A-Za-z0-9_]+\/[A-Za-z0-9_]+$/.test(path))
      return json({ error: "잘못된 경로" }, 400);
    if (!/^\d{7}\//.test(path)) path = "1471000/" + path;

    const params = (body?.params ?? {}) as Record<string, string | number>;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
    }
    if (!qs.has("type")) qs.set("type", "json");
    if (!qs.has("numOfRows")) qs.set("numOfRows", "20");
    if (!qs.has("pageNo")) qs.set("pageNo", "1");

    const url = `https://apis.data.go.kr/${path}?serviceKey=${key}&${qs.toString()}`;
    const r = await fetch(url);
    const text = await r.text();

    // JSON이면 그대로 전달
    try {
      return json({ ok: true, data: JSON.parse(text) });
    } catch {
      /* not JSON */
    }
    // XML 오류 응답에서 메시지 추출 (인증키 오류 등)
    const msg =
      /<returnAuthMsg>([^<]+)<\/returnAuthMsg>/.exec(text)?.[1] ||
      /<resultMsg>([^<]+)<\/resultMsg>/.exec(text)?.[1] ||
      /<errMsg>([^<]+)<\/errMsg>/.exec(text)?.[1] ||
      text.slice(0, 200);
    return json({ ok: false, error: msg, status: r.status });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "unknown" }, 500);
  }
});
