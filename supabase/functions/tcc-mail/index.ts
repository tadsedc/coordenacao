import { createClient } from "npm:@supabase/supabase-js@2";
import { buildNotice } from "./notice.ts";

const headers = {
  "Access-Control-Allow-Origin": "https://tadsedc.site",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Cache-Control": "no-store",
};
const json = (sent: boolean, status = 200) => Response.json({ sent }, { status, headers });
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json(false, 405);
  try {
    const body = await request.json();
    const code = typeof body.codigo === "string" && uuid.test(body.codigo) ? body.codigo : null;
    const work = typeof body.trabalho === "string" && uuid.test(body.trabalho) ? body.trabalho : null;
    if ((!code && !work) || (code && work)) return json(false, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json(false, 503);
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    let teacher: string | null = null;
    if (work) {
      const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
      if (!token) return json(false, 401);
      const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
      const { data: { user }, error } = await userClient.auth.getUser(token);
      if (error || !user) return json(false, 401);
      teacher = user.id;
    }
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
    async function send(rpc: string, args: Record<string, string | null>) {
    const { data, error } = await admin.rpc(rpc, args);
    if (error) return json(false, 503);
    if (!data) return json(false);
    if (data.enviado) return json(true);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tcc/${data.id}`,
      },
      body: JSON.stringify(buildNotice(data)),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return json(false, 502);
    const { error: confirmError } = await admin.rpc("tcc_confirmar_aviso", { p_id: data.id });
    return json(!confirmError, confirmError ? 503 : 200);
    }
    const studentNotice = send("tcc_reservar_aviso", {
      p_codigo: code, p_trabalho: work, p_docente: teacher,
    });
    if (!code) return await studentNotice;
    const [student] = await Promise.allSettled([
      studentNotice,
      send("tcc_reservar_aviso_orientador", { p_codigo: code }),
    ]);
    // A confirmação exibida ao estudante diz respeito somente ao próprio aviso.
    return student.status === "fulfilled" ? student.value : json(false, 503);
  } catch {
    return json(false, 503);
  }
});
