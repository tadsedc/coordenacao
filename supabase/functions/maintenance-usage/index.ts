import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_REF = Deno.env.get("PROJECT_REF") || "uvdnejmdqgwdcipctyur";
const ALLOWED_ORIGINS = new Set([
  "https://tadsedc.site",
  "https://www.tadsedc.site",
  "https://tadsedc.github.io",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://tadsedc.site",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" },
  });
}

function firstKey(raw: string | undefined, fallback: string | undefined) {
  if (!raw) return fallback || "";
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || fallback || "";
  } catch {
    return fallback || "";
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = firstKey(
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
  );
  const secretKey = firstKey(
    Deno.env.get("SUPABASE_SECRET_KEYS"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY"),
  );
  const authorization = request.headers.get("Authorization") || "";

  if (!supabaseUrl || !publishableKey || !secretKey || !authorization.startsWith("Bearer ")) {
    return json(request, { error: "Acesso não autorizado." }, 401);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(request, { error: "Sessão inválida." }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from("perfis")
    .select("papel,ativo")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile?.ativo || profile.papel !== "coordenador") {
    return json(request, { error: "Apenas a coordenação pode consultar a manutenção." }, 403);
  }

  const { data: metrics, error: metricsError } = await adminClient
    .rpc("obter_metricas_manutencao");
  if (metricsError) return json(request, { error: metricsError.message }, 500);

  let apiRequests: number | null = null;
  let managementWarning = "";
  const managementToken = Deno.env.get("MANAGEMENT_TOKEN");
  if (managementToken) {
    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/analytics/endpoints/usage.api-requests-count`,
        { headers: { Authorization: `Bearer ${managementToken}` } },
      );
      if (response.ok) {
        const payload = await response.json();
        apiRequests = Number(payload?.result?.[0]?.count ?? 0);
      } else {
        managementWarning = "A API de consumo não respondeu. As métricas internas continuam disponíveis.";
      }
    } catch {
      managementWarning = "Não foi possível consultar as requisições da API neste momento.";
    }
  } else {
    managementWarning = "Adicione MANAGEMENT_TOKEN para exibir requisições da API.";
  }

  return json(request, {
    collectedAt: new Date().toISOString(),
    projectRef: PROJECT_REF,
    plan: "Free",
    limits: {
      databaseBytes: 500 * 1024 * 1024,
      storageBytes: 1024 * 1024 * 1024,
      monthlyActiveUsers: 50000,
      edgeInvocations: 500000,
      egressBytes: 5 * 1024 * 1024 * 1024,
    },
    metrics: { ...(metrics || {}), apiRequests },
    managementConfigured: Boolean(managementToken),
    managementWarning,
  });
});
