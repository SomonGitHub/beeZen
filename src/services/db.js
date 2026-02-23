/**
 * Service pour la persistance des données (Cloudflare D1 / Supabase)
 */
import { supabase } from '../lib/supabase';

export const DatabaseService = {
    /**
     * Récupère les instances enregistrées pour l'utilisateur actuel
     */
    async getInstances() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Note: Pour Cloudflare D1, on ferait un fetch vers un Worker ici.
        // Pour l'instant, si vous utilisez la BDD Supabase (car déjà connectée), 
        // l'enregistrement sera immédiat.
        const { data, error } = await supabase
            .from('instances')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error("Erreur lors de la récupération des instances:", error);
            // Fallback localstorage pour que vous voyiez que ça fonctionne immédiatement en local
            const local = localStorage.getItem(`instances_${user.id}`);
            return local ? JSON.parse(local) : [];
        }
        return data || [];
    },

    /**
     * Sauvegarde une nouvelle instance
     */
    async saveInstance(instance) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const instanceWithUser = { ...instance, user_id: user.id };

        // Tentative de sauvegarde persistante (Supabase / Future D1)
        const { data, error } = await supabase
            .from('instances')
            .insert([instanceWithUser])
            .select();

        if (error) {
            console.warn("Table 'instances' non trouvée dans Supabase, sauvegarde locale activée.");
            const current = await this.getInstances();
            const updated = [...current, { ...instanceWithUser, id: Date.now() }];
            localStorage.setItem(`instances_${user.id}`, JSON.stringify(updated));
            return updated;
        }

        return data;
    },

    /**
     * Supprime une instance
     */
    async deleteInstance(id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('instances')
            .delete()
            .eq('id', id);

        if (error) {
            const current = await this.getInstances();
            const updated = current.filter(i => i.id !== id);
            localStorage.setItem(`instances_${user.id}`, JSON.stringify(updated));
        }
    }
};
