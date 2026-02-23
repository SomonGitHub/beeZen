/**
 * Service pour l'analyse IA via ChatGPT
 * Utilise notre Worker Proxy pour sécuriser la clé OpenAI
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const AIService = {
    /**
     * Analyse les thèmes et suggère des articles
     * @param {Array} tickets - Liste des derniers tickets (agrégés)
     */
    async analyzeTickets(tickets) {
        if (!tickets || tickets.length === 0) return null;
        if (!OPENAI_KEY) throw new Error("Clé OpenAI (VITE_OPENAI_API_KEY) manquante dans .env");

        // On prépare un résumé très court pour optimiser les tokens
        const summaries = tickets.slice(0, 50).map(t => t.subject).join('\n');

        const prompt = `En tant qu'expert support Bee2link, analyse ces sujets de tickets réels et donne moi : 
    1. Un résumé des tendances (2 phrases).
    2. Une suggestion d'article précis pour le centre d'aide.
    3. Une alerte si tu vois un pic anormal de bugs.
    
    Tickets :
    ${summaries}`;

        try {
            const response = await fetch(`${WORKER_URL}?url=https://api.openai.com/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-OpenAI-Key': OPENAI_KEY,
                    'X-BeeZen-AI': 'true'
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error("Erreur lors de l'analyse IA");

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }
};
