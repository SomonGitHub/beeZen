/**
 * Cloudflare Worker Proxy pour BeeZen
 * 1. Résout les problèmes de CORS
 * 2. Sécurise les appels vers Zendesk
 */

export default {
    async fetch(request, env, ctx) {
        // Configuration CORS étendue
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        };

        // Gestion du preflight OPTIONS
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const targetUrl = url.searchParams.get("url");

        if (!targetUrl) {
            return new Response("Missing target URL", { status: 400, headers: corsHeaders });
        }

        // Préparation des headers pour l'appel cible
        const headers = new Headers();
        headers.set("Content-Type", "application/json");

        // Logique spécifique : ZENDESK
        const zdDomain = request.headers.get("X-Zendesk-Domain");
        const zdEmail = request.headers.get("X-Zendesk-Email");
        const zdToken = request.headers.get("X-Zendesk-Token");

        if (zdDomain && zdEmail && zdToken) {
            const auth = btoa(`${zdEmail}/token:${zdToken}`);
            headers.set("Authorization", `Basic ${auth}`);
        }

        // Logique spécifique : OPENAI
        const aiKey = request.headers.get("X-OpenAI-Key");
        if (aiKey) {
            headers.set("Authorization", `Bearer ${aiKey}`);
        }

        // Si c'est un POST, on récupère le body
        let body = null;
        if (request.method === "POST") {
            body = await request.text();
        }

        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: headers,
                body: body
            });

            const responseBody = await response.text();

            return new Response(responseBody, {
                status: response.status,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    },
};
