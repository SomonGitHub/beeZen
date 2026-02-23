/**
 * Cloudflare Worker Proxy & Sync Engine pour Bee2link Support Dashboard
 * 1. Gestion du Delta Sync (Zendesk -> D1)
 * 2. Persistance des tickets en base SQL D1
 * 3. Service des données au Frontend (D1 -> Dashboard)
 */

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "proxy"; // "proxy", "sync", "get_tickets"

        // === LOGIQUE DE SYNCHRONISATION (DELTA) ===
        if (action === "sync") {
            return await handleSync(request, env, corsHeaders);
        }

        // === RÉCUPÉRATION DES DONNÉES (FRONTEND) ===
        if (action === "get_tickets") {
            return await handleGetTickets(request, env, corsHeaders);
        }

        // === PROXY CLASSIQUE (Pour compatibilité et OpenAI) ===
        return await handleProxy(request, env, corsHeaders);
    },
};

/**
 * Handle Sync: Récupère uniquement le Delta depuis Zendesk et met à jour D1
 */
async function handleSync(request, env, corsHeaders) {
    const { instanceId, domain, email, token, startTime } = await request.json();

    // 1. Récupérer le dernier sync_timestamp depuis D1
    const syncStatus = await env.DB.prepare(
        "SELECT last_sync_timestamp FROM sync_status WHERE instance_id = ?"
    ).bind(instanceId).first();

    // Si on a un startTime forcé (ex: 60 jours), on l'utilise, sinon on prend le dernier sync
    let effectiveStartTime = syncStatus ? syncStatus.last_sync_timestamp : startTime;

    const targetUrl = `https://${domain}/api/v2/incremental/tickets.json?start_time=${effectiveStartTime}&include=users,metric_sets,brands`;
    const auth = btoa(`${email}/token:${token}`);

    const response = await fetch(targetUrl, {
        headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }
    });

    if (!response.ok) return new Response(await response.text(), { status: response.status, headers: corsHeaders });

    const data = await response.json();
    const tickets = data.tickets || [];

    // 2. Insérer/Update les tickets dans D1
    if (tickets.length > 0) {
        // Préparation du mapping des marques pour cette page
        const brandsMap = (data.brands || []).reduce((acc, b) => { acc[b.id] = b.name; return acc; }, {});
        const metricsMap = (data.metric_sets || []).reduce((acc, m) => { acc[m.ticket_id] = m; return acc; }, {});

        const statements = tickets.map(t => {
            return env.DB.prepare(`
                INSERT INTO tickets (id, instance_id, subject, status, created_at, updated_at, brand_name, channel, metrics_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                    status=excluded.status, 
                    updated_at=excluded.updated_at, 
                    metrics_json=excluded.metrics_json
            `).bind(
                t.id,
                instanceId,
                t.subject,
                t.status,
                t.created_at,
                t.updated_at,
                brandsMap[t.brand_id] || "Inconnu",
                t.via?.channel || "autre",
                JSON.stringify(metricsMap[t.id] || null)
            );
        });

        // Exécution par lots
        await env.DB.batch(statements);
    }

    // 3. Mettre à jour le sync_status
    if (data.end_time) {
        await env.DB.prepare(`
            INSERT INTO sync_status (instance_id, last_sync_timestamp, last_sync_date, ticket_count)
            VALUES (?, ?, ?, (SELECT count(*) FROM tickets WHERE instance_id = ?))
            ON CONFLICT(instance_id) DO UPDATE SET 
                last_sync_timestamp=excluded.last_sync_timestamp,
                last_sync_date=excluded.last_sync_date,
                ticket_count=excluded.ticket_count
        `).bind(instanceId, data.end_time, new Date().toISOString(), instanceId).run();
    }

    return new Response(JSON.stringify({
        success: true,
        count: tickets.length,
        hasMore: data.count === 1000
    }), { headers: corsHeaders });
}

/**
 * Handle Get Tickets: Renvoie les données depuis D1 au Frontend
 */
async function handleGetTickets(request, env, corsHeaders) {
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");
    const period = url.searchParams.get("period") || "30d"; // non utilisé ici car on filtre côté front, mais utile pour optimisation future

    if (!instanceId) return new Response("Missing instanceId", { status: 400, headers: corsHeaders });

    // On récupère les 3000 derniers tickets pour cette instance
    const { results } = await env.DB.prepare(
        "SELECT * FROM tickets WHERE instance_id = ? ORDER BY created_at DESC LIMIT 3000"
    ).bind(instanceId).all();

    // Reformatage pour le frontend (parsing du JSON des metrics)
    const formatted = results.map(t => ({
        ...t,
        metrics: t.metrics_json ? JSON.parse(t.metrics_json) : null
    }));

    return new Response(JSON.stringify({ tickets: formatted }), { headers: corsHeaders });
}

/**
 * Handle Proxy: Pour OpenAI et autres appels directs
 */
async function handleProxy(request, env, corsHeaders) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) return new Response("Missing target URL", { status: 400, headers: corsHeaders });

    const headers = new Headers();
    const zdEmail = request.headers.get("X-Zendesk-Email");
    const zdToken = request.headers.get("X-Zendesk-Token");
    if (zdEmail && zdToken) headers.set("Authorization", `Basic ${btoa(`${zdEmail}/token:${zdToken}`)}`);

    const aiKey = request.headers.get("X-OpenAI-Key");
    if (aiKey) headers.set("Authorization", `Bearer ${aiKey}`);

    let body = request.method === "POST" ? await request.text() : null;
    const response = await fetch(targetUrl, { method: request.method, headers, body });
    return new Response(await response.text(), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
