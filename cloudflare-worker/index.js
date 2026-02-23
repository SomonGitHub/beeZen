/**
 * Cloudflare Worker Proxy & Sync Engine pour Bee2link Support Dashboard
 * VERSION : Multi-page Sync Engine (Catch-up mode)
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
        const action = url.searchParams.get("action") || "proxy";

        if (action === "sync") return await handleSync(request, env, corsHeaders);
        if (action === "get_tickets") return await handleGetTickets(request, env, corsHeaders);
        return await handleProxy(request, env, corsHeaders);
    },
};

/**
 * Handle Sync: Récupère le Delta et boucle jusqu'à 5 pages (5000 tickets) par appel
 */
async function handleSync(request, env, corsHeaders) {
    try {
        const { instanceId, domain, email, token, startTime } = await request.json();

        // 1. Récupérer le dernier sync_timestamp
        const syncStatus = await env.DB.prepare(
            "SELECT last_sync_timestamp FROM sync_status WHERE instance_id = ?"
        ).bind(instanceId).first();

        let currentStartTime = syncStatus ? syncStatus.last_sync_timestamp : startTime;
        let totalSynced = 0;
        let pageCount = 0;
        let hasMore = true;
        const maxSyncPages = 10; // On synchronise jusqu'à 10 000 tickets par clic sur "Actualiser"

        const auth = btoa(`${email}/token:${token}`);

        while (hasMore && pageCount < maxSyncPages) {
            const targetUrl = `https://${domain}/api/v2/incremental/tickets.json?start_time=${currentStartTime}&include=users,metric_sets,brands`;

            const response = await fetch(targetUrl, {
                headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }
            });

            if (!response.ok) break;

            const data = await response.json();
            const tickets = data.tickets || [];

            if (tickets.length > 0) {
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

                await env.DB.batch(statements);
                totalSynced += tickets.length;
            }

            if (data.count < 1000 || !data.end_time) {
                hasMore = false;
            } else {
                currentStartTime = data.end_time;
                pageCount++;

                // Mettre à jour le timestamp au fur et à mesure pour ne pas tout perdre si timeout
                await env.DB.prepare(`
                    INSERT INTO sync_status (instance_id, last_sync_timestamp, last_sync_date, ticket_count)
                    VALUES (?, ?, ?, (SELECT count(*) FROM tickets WHERE instance_id = ?))
                    ON CONFLICT(instance_id) DO UPDATE SET 
                        last_sync_timestamp=excluded.last_sync_timestamp,
                        last_sync_date=excluded.last_sync_date,
                        ticket_count=excluded.ticket_count
                `).bind(instanceId, data.end_time, new Date().toISOString(), instanceId).run();
            }
        }

        return new Response(JSON.stringify({
            success: true,
            synced: totalSynced,
            hasMore: hasMore,
            last_timestamp: currentStartTime
        }), { headers: corsHeaders });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Handle Get Tickets
 */
async function handleGetTickets(request, env, corsHeaders) {
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");

    if (!instanceId) return new Response("Missing instanceId", { status: 400, headers: corsHeaders });

    const { results } = await env.DB.prepare(
        "SELECT * FROM tickets WHERE instance_id = ? ORDER BY created_at DESC LIMIT 5000"
    ).bind(instanceId).all();

    const formatted = results.map(t => ({
        ...t,
        metrics: t.metrics_json ? JSON.parse(t.metrics_json) : null
    }));

    return new Response(JSON.stringify({ tickets: formatted }), { headers: corsHeaders });
}

/**
 * Handle Proxy
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
