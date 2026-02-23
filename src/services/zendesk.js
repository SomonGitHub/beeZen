/**
 * Service pour la gestion des données Zendesk via PROXY CLOUDFLARE
 * Résout les problèmes de CORS et sécurise les credentials.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export const ZendeskService = {
    /**
     * Nettoie le domaine pour s'assurer qu'il est au bon format
     */
    sanitizeDomain(domain) {
        if (!domain) return "";
        // On enlève TOUT ce qui ressemble à un protocole (http, https, ://) répétitif
        let clean = domain.replace(/https?:\/\//gi, '').replace(/:\/\//g, '');
        // On enlève les slashes de début et de fin
        clean = clean.replace(/^\/+|\/+$/g, '');
        return clean.trim();
    },

    /**
     * Récupère les tickets via le Cloudflare Worker Proxy
     * @param {Object} instance - L'objet instance (domaine, email, token)
     * @param {number} startTime - Timestamp UNIX de début
     */
    async fetchTickets(instance, startTime = 0) {
        if (!instance || !instance.domain || !instance.token) return { tickets: [], users: [] };

        const cleanDomain = this.sanitizeDomain(instance.domain);
        let allTickets = [];
        let allUsers = [];
        let brandsMap = {};
        let currentStartTime = startTime;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 3; // Limite à 3000 tickets pour éviter les timeouts et la surcharge mémoire

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
                    throw new Error(`Erreur HTTP ${response.status}: ${errorText.substring(0, 100)}`);
                }

                const data = await response.json();
                const tickets = data.tickets || [];
                const users = data.users || [];

                // On accumule les utilisateurs (on dédoublonnera à la fin si nécessaire)
                allUsers = [...allUsers, ...users];

                // On mappe les marques (disponibles sur chaque page)
                (data.brands || []).forEach(b => {
                    brandsMap[b.id] = b.name;
                });

                // On mappe les metrics de cette page
                const metricsMap = (data.metric_sets || []).reduce((acc, m) => {
                    acc[m.ticket_id] = m;
                    return acc;
                }, {});

                // On enrichit les tickets de cette page
                const enriched = tickets.map(t => ({
                    ...t,
                    metrics: metricsMap[t.id] || null,
                    brand_name: brandsMap[t.brand_id] || `Marque ${t.brand_id}`
                }));

                allTickets = [...allTickets, ...enriched];

                // Pagination Incremental : on regarde count et on met à jour start_time
                if (data.count < 1000 || !data.end_time) {
                    hasMore = false;
                } else {
                    currentStartTime = data.end_time;
                    pageCount++;
                }
            }

            // Déduplication des tickets par ID (au cas où un ticket apparaît sur 2 pages)
            const uniqueTickets = Array.from(new Map(allTickets.map(t => [t.id, t])).values())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // Déduplication des utilisateurs par ID
            const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());

            return {
                tickets: uniqueTickets,
                users: uniqueUsers
            };
        } catch (error) {
            console.error("Erreur pagination BeeZen:", error);
            throw error;
        }
    },

    /**
     * Agrégation simplifiée des thèmes pour l'affichage réels
     */
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
