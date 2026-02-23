/**
 * Cloudflare Worker Proxy pour BeeZen
 * 1. Résout les problèmes de CORS
 * 2. Sécurise les appels vers Zendesk
 */

export default {
    async fetch(request, env, ctx) {
        // Configuration CORS
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Zendesk-Domain, X-Zendesk-Email, X-Zendesk-Token",
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

        // Récupération des credentials via headers (plus propre que dans l'URL)
        const domain = request.headers.get("X-Zendesk-Domain");
        const email = request.headers.get("X-Zendesk-Email");
        const token = request.headers.get("X-Zendesk-Token");

        if (!domain || !email || !token) {
            return new Response("Missing Zendesk Credentials", { status: 401, headers: corsHeaders });
        }

        // Préparation de l'auth Basic
        const auth = btoa(`${email}/token:${token}`);

        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });

            const body = await response.text();

            return new Response(body, {
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
