/**
 * Cloudflare Worker Proxy & Sync Engine pour Bee2link Support Dashboard
 * VERSION : Multi-page Sync Engine with User & Channel Support
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
        if (action === "sync_staff") return await handleSyncStaff(request, env, corsHeaders);
        if (action === "get_tickets") return await handleGetTickets(request, env, corsHeaders);
        if (action === "get_agent_statuses") return await handleAgentStatuses(request, env, corsHeaders);

        return await handleProxy(request, env, corsHeaders);
    },
};

/**
 * Handle Sync: Récupère Delta (Tickets + Users)
 */
async function handleSync(request, env, corsHeaders) {
    try {
        const { instanceId, domain, email, token, startTime } = await request.json();
        const syncStatus = await env.DB.prepare("SELECT last_sync_timestamp FROM sync_status WHERE instance_id = ?").bind(instanceId).first();

        let currentStartTime = syncStatus ? syncStatus.last_sync_timestamp : startTime;
        let totalSynced = 0;
        let pageCount = 0;
        let hasMore = true;
        const maxSyncPages = 10;

        const auth = btoa(`${email}/token:${token}`);

        while (hasMore && pageCount < maxSyncPages) {
            const targetUrl = `https://${domain}/api/v2/incremental/tickets.json?start_time=${currentStartTime}&include=users,metric_sets,brands`;
            const response = await fetch(targetUrl, { headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" } });

            if (!response.ok) break;

            const data = await response.json();
            const tickets = data.tickets || [];
            const users = data.users || [];

            // 1. Sync des USERS (Agents/Demandeurs)
            if (users.length > 0) {
                const userStatements = users.map(u => {
                    return env.DB.prepare(`
                        INSERT INTO users (id, instance_id, name, email, role, active)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, active=excluded.active
                    `).bind(u.id, instanceId, u.name, u.email, u.role, u.active ? 1 : 0);
                });
                await env.DB.batch(userStatements);
            }

            // 2. Sync des TICKETS
            if (tickets.length > 0) {
                const brandsMap = (data.brands || []).reduce((acc, b) => { acc[b.id] = b.name; return acc; }, {});
                const metricsMap = (data.metric_sets || []).reduce((acc, m) => { acc[m.ticket_id] = m; return acc; }, {});

                const statements = tickets.map(t => {
                    return env.DB.prepare(`
                        INSERT INTO tickets (id, instance_id, subject, status, created_at, updated_at, brand_name, channel, metrics_json, assignee_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET 
                            status=excluded.status, 
                            updated_at=excluded.updated_at, 
                            metrics_json=excluded.metrics_json,
                            assignee_id=excluded.assignee_id
                    `).bind(
                        t.id, instanceId, t.subject, t.status, t.created_at, t.updated_at,
                        brandsMap[t.brand_id] || "Inconnu", t.via?.channel || "autre",
                        JSON.stringify(metricsMap[t.id] || null),
                        t.assignee_id
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
                await env.DB.prepare(`
                    INSERT INTO sync_status (instance_id, last_sync_timestamp, last_sync_date, ticket_count)
                    VALUES (?, ?, ?, (SELECT count(*) FROM tickets WHERE instance_id = ?))
                    ON CONFLICT(instance_id) DO UPDATE SET 
                        last_sync_timestamp=excluded.last_sync_timestamp, last_sync_date=excluded.last_sync_date, ticket_count=excluded.ticket_count
                `).bind(instanceId, data.end_time, new Date().toISOString(), instanceId).run();
            }
        }

        return new Response(JSON.stringify({ success: true, synced: totalSynced, hasMore: hasMore }), { headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Handle Get Tickets : Renvoie Tickets + Users
 */
async function handleGetTickets(request, env, corsHeaders) {
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");
    if (!instanceId) return new Response("Missing instanceId", { status: 400, headers: corsHeaders });

    // 1. Récupérer les tickets
    const ticketsQuery = await env.DB.prepare("SELECT * FROM tickets WHERE instance_id = ? ORDER BY created_at DESC LIMIT 5000").bind(instanceId).all();

    // 2. Récupérer les users (Agents)
    const usersQuery = await env.DB.prepare("SELECT * FROM users WHERE instance_id = ?").bind(instanceId).all();

    const formattedTickets = ticketsQuery.results.map(t => ({
        ...t,
        metrics: t.metrics_json ? JSON.parse(t.metrics_json) : null
    }));

    return new Response(JSON.stringify({
        tickets: formattedTickets,
        users: usersQuery.results
    }), { headers: corsHeaders });
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

async function handleAgentStatuses(request, env, corsHeaders) {
    const url = new URL(request.url);
    const domain = url.searchParams.get("domain");
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!domain || !email || !token) {
        return new Response(JSON.stringify({ error: "Credentials missing" }), { status: 400, headers: corsHeaders });
    }

    try {
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const auth = "Basic " + btoa(email + "/token:" + token);

        // Stratégie de repli : on essaie plusieurs endpoints Zendesk
        const endpoints = [
            `https://${cleanDomain}/api/v2/agent_availabilities`, // JSON:API style
            `https://${cleanDomain}/api/v2/agent_availabilities.json`, // Support style
            `https://${cleanDomain}/api/v2/agent_statuses` // Fallback statuses
        ];

        let lastError = null;
        for (const url of endpoints) {
            console.log(`Trying agent status endpoint: ${url}`);
            try {
                const response = await fetch(url, {
                    headers: {
                        "Authorization": auth,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const availabilities = data.agent_availabilities || data.data || [];
                    console.log(`Success on ${url} with ${availabilities.length} items`);
                    return new Response(JSON.stringify({
                        ...data,
                        agent_availabilities: availabilities,
                        source_url: url
                    }), { headers: corsHeaders });
                } else {
                    const err = await response.text();
                    lastError = { status: response.status, text: err, url };
                    console.warn(`Failed endpoint ${url}: ${response.status}`);
                }
            } catch (e) {
                console.warn(`Fetch error for ${url}: ${e.message}`);
            }
        }

        // Si aucun n'a marché
        return new Response(JSON.stringify({
            error: "All presence endpoints failed",
            detail: `Last try: ${lastError?.status} on ${lastError?.url}. Error: ${lastError?.text}`,
            agent_availabilities: []
        }), { headers: corsHeaders });

    } catch (e) {
        console.error(`Worker error in handleAgentStatuses: ${e.message}`);
        return new Response(JSON.stringify({ error: e.message, agent_availabilities: [] }), { status: 500, headers: corsHeaders });
    }
}
/**
 * Action: sync_staff - Récupère TOUS les agents/admins de Zendesk
 */
async function handleSyncStaff(request, env, corsHeaders) {
    try {
        const { instanceId, domain, email, token } = await request.json();
        const auth = btoa(`${email}/token:${token}`);

        let url = `https://${domain}/api/v2/users.json?role[]=agent&role[]=admin`;
        let total = 0;

        // On fait au moins une page (100 agents), on pourra boucler si besoin plus tard
        const response = await fetch(url, { headers: { "Authorization": `Basic ${auth}` } });
        if (!response.ok) throw new Error(`Zendesk error: ${response.status}`);

        const data = await response.json();
        const users = data.users || [];

        if (users.length > 0) {
            const userStatements = users.map(u => {
                return env.DB.prepare(`
                    INSERT INTO users (id, instance_id, name, email, role, active, photo_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET 
                        name=excluded.name, 
                        email=excluded.email, 
                        active=excluded.active, 
                        photo_url=excluded.photo_url
                `).bind(u.id, instanceId, u.name, u.email, u.role, u.active ? 1 : 0, u.photo?.content_url || null);
            });
            await env.DB.batch(userStatements);
            total = users.length;
        }

        return new Response(JSON.stringify({ success: true, count: total }), { headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

// ... fin du fichier ...
