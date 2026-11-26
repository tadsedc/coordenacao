import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://tadsedc.site",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: object, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const token = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return json({ error: "Sessão necessária." }, 401);

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return json({ error: "Sessão inválida." }, 401);
  const { data: profile, error: profileError } = await client.from("perfis")
    .select("papel,ativo").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.ativo || profile.papel !== "coordenador") {
    return json({ error: "Acesso exclusivo da coordenação." }, 403);
  }

  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  const recipient = Deno.env.get("TCC_TEST_EMAIL")?.trim();
  if (!key || !recipient || !/^[^\s,@;<>]+@[^\s,@;<>]+\.[^\s,@;<>]+$/.test(recipient)) {
    return json({ error: "Configure RESEND_API_KEY e um único endereço em TCC_TEST_EMAIL." }, 503);
  }

  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tcc-test/${new Date().toISOString().slice(0, 10)}/${recipient.toLowerCase()}`,
      },
      body: JSON.stringify({
        from: "TCC | Coordenação <tcc@avisos.tadsedc.site>",
        to: [recipient],
        subject: "Teste de envio — Portal de TCC",
        text: "Esta mensagem confirma o teste de envio pelo remetente do Portal de TCC. Nenhuma submissão foi criada ou alterada.",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) return json({ error: "O Resend não aceitou o envio.", status: result.status }, 502);
    const { id } = await result.json();
    return json({ aceito: true, id });
  } catch {
    return json({ error: "Não foi possível concluir a comunicação com o Resend." }, 502);
  }
});
