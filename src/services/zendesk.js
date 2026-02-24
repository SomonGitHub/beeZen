/**
 * Service pour la gestion des données Zendesk via PROXY CLOUDFLARE (Version D1 Delta Sync)
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export const ZendeskService = {
    sanitizeDomain(domain) {
        if (!domain) return "";
        let clean = domain.replace(/https?:\/\//gi, '').replace(/:\/\//g, '');
        clean = clean.replace(/^\/+|\/+$/g, '');
        return clean.trim();
    },

    /**
     * Nouvelle méthode d'analyse de tickets avec Delta Sync
     */
    async fetchTickets(instance, startTime = 0) {
        if (!instance || !instance.domain || !instance.token) return { tickets: [], users: [] };

        const cleanDomain = this.sanitizeDomain(instance.domain);

        try {
            // 1. Lancer la synchronisation Delta (Zendesk -> D1)
            // On fait un appel sync au worker
            console.log("🔄 BeeZen: Lancement de la synchronisation Delta...");
            const syncResponse = await fetch(`${WORKER_URL}?action=sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceId: instance.id,
                    domain: cleanDomain,
                    email: instance.email,
                    token: instance.token,
                    startTime: startTime
                })
            });

            if (!syncResponse.ok) {
                console.error("⚠️ Erreur Sync:", await syncResponse.text());
            }

            // 2. Récupérer les tickets consolidés depuis D1
            console.log("📥 BeeZen: Récupération des données depuis D1...");
            const dataResponse = await fetch(`${WORKER_URL}?action=get_tickets&instanceId=${instance.id}`);

            if (!dataResponse.ok) {
                throw new Error(`Erreur récupération D1: ${dataResponse.status}`);
            }

            const result = await dataResponse.json();

            return {
                tickets: result.tickets || [],
                users: result.users || []
            };
        } catch (error) {
            console.error("Erreur Sync Engine BeeZen:", error);
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
    },

    async fetchAgentStatuses(instance) {
        try {
            const cleanDomain = this.sanitizeDomain(instance.domain);
            const url = `${WORKER_URL}?action=get_agent_statuses&domain=${cleanDomain}&email=${instance.email}&token=${instance.token}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Fetch failed');
            return await response.json();
        } catch (error) {
            console.error('Error fetching agent statuses:', error);
            return null;
        }
    }
};
