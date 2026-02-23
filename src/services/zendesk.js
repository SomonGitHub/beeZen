/**
 * Service pour la gestion des données Zendesk via PROXY CLOUDFLARE
 * Résout les problèmes de CORS et sécurise les credentials.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export const ZendeskService = {
    /**
     * Récupère les tickets via le Cloudflare Worker Proxy
     * @param {Object} instance - L'objet instance (domaine, email, token)
     * @param {number} startTime - Timestamp UNIX de début
     */
    async fetchTickets(instance, startTime = 0) {
        if (!instance || !instance.domain || !instance.token) return [];

        const targetUrl = `https://${instance.domain}/api/v2/incremental/tickets.json?start_time=${startTime}`;

        try {
            // On appelle notre Proxy plutôt que Zendesk directement
            const response = await fetch(`${WORKER_URL}?url=${encodeURIComponent(targetUrl)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zendesk-Domain': instance.domain,
                    'X-Zendesk-Email': instance.email,
                    'X-Zendesk-Token': instance.token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur Proxy: ${response.statusText}`);
            }

            const data = await response.json();
            return data.tickets || [];
        } catch (error) {
            console.error("Erreur via Proxy BeeZen:", error);
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
