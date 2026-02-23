/**
 * Service pour la gestion des données Zendesk via PROXY CLOUDFLARE
 * Résout les problèmes de CORS et sécurise les credentials.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

// Cache simple en mémoire pour éviter de spammer l'API Incremental Export (limite 10 req/min)
const ticketCache = {
    data: null,
    timestamp: 0,
    instanceId: null,
    startTime: 0
};

export const ZendeskService = {
    /**
     * Nettoie le domaine pour s'assurer qu'il est au bon format
     */
    sanitizeDomain(domain) {
        if (!domain) return "";
        let clean = domain.replace(/https?:\/\//gi, '').replace(/:\/\//g, '');
        clean = clean.replace(/^\/+|\/+$/g, '');
        return clean.trim();
    },

    /**
     * Récupère les tickets via le Cloudflare Worker Proxy avec mise en cache
     */
    async fetchTickets(instance, startTime = 0) {
        if (!instance || !instance.domain || !instance.token) return { tickets: [], users: [] };

        // Vérification du cache (2 minutes de validité pour éviter les 429)
        const now = Date.now();
        if (ticketCache.data &&
            ticketCache.instanceId === instance.id &&
            ticketCache.startTime === startTime &&
            (now - ticketCache.timestamp) < 120000) {
            console.log("🚀 BeeZen: Retour du cache pour éviter 429");
            return ticketCache.data;
        }

        const cleanDomain = this.sanitizeDomain(instance.domain);
        let allTickets = [];
        let allUsers = [];
        let brandsMap = {};
        let currentStartTime = startTime;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 10;

        try {
            while (hasMore && pageCount < maxPages) {
                const targetUrl = `https://${cleanDomain}/api/v2/incremental/tickets.json?start_time=${currentStartTime}&include=users,metric_sets,brands`;

                const response = await fetch(`${WORKER_URL}?url=${encodeURIComponent(targetUrl)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Zendesk-Domain': cleanDomain,
                        'X-Zendesk-Email': instance.email,
                        'X-Zendesk-Token': instance.token
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    // Si 429, on tente d'être explicite pour l'utilisateur
                    if (response.status === 429) {
                        throw new Error("Limite API Zendesk atteinte (429). Veuillez patienter 1 minute avant d'actualiser.");
                    }
                    throw new Error(`Erreur HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                }

                const data = await response.json();
                const tickets = data.tickets || [];
                const users = data.users || [];

                allUsers = [...allUsers, ...users];

                (data.brands || []).forEach(b => {
                    brandsMap[b.id] = b.name;
                });

                const metricsMap = (data.metric_sets || []).reduce((acc, m) => {
                    acc[m.ticket_id] = m;
                    return acc;
                }, {});

                const enriched = tickets.map(t => ({
                    ...t,
                    metrics: metricsMap[t.id] || null,
                    brand_name: brandsMap[t.brand_id] || `Marque ${t.brand_id}`
                }));

                allTickets = [...allTickets, ...enriched];

                if (data.count < 1000 || !data.end_time) {
                    hasMore = false;
                } else {
                    currentStartTime = data.end_time;
                    pageCount++;
                }
            }

            const uniqueTickets = Array.from(new Map(allTickets.map(t => [t.id, t])).values())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());

            const result = {
                tickets: uniqueTickets,
                users: uniqueUsers
            };

            // Mise à jour du cache
            ticketCache.data = result;
            ticketCache.timestamp = now;
            ticketCache.instanceId = instance.id;
            ticketCache.startTime = startTime;

            return result;
        } catch (error) {
            console.error("Erreur pagination BeeZen:", error);
            throw error;
        }
    },

    aggregateMetrics(tickets) {
        if (!tickets || tickets.length === 0) return {};
        const categories = {};
        tickets.forEach(t => {
            const subject = t.subject?.toLowerCase() || "";
            let theme = 'Général';
            if (subject.includes('connexion') || subject.includes('accès') || subject.includes('identifiant')) theme = 'Authentification';
            if (subject.includes('publication') || subject.includes('immo') || subject.includes('annonce')) theme = 'Publication';
            if (subject.includes('paiement') || subject.includes('facture') || subject.includes('abonnement')) theme = 'Facturation';
            if (subject.includes('bug') || subject.includes('erreur') || subject.includes('bloqué')) theme = 'Incident Technique';
            categories[theme] = (categories[theme] || 0) + 1;
        });
        return categories;
    }
};
