/**
 * Service pour la persistance des données (Partage Global)
 */
import { supabase } from '../lib/supabase';

export const DatabaseService = {
    /**
     * Récupère TOUTES les instances (Partagées entre utilisateurs)
     */
    async getInstances() {
        const { data, error } = await supabase
            .from('instances')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Erreur lors de la récupération des instances:", error);
            // Fallback localStorage
            const local = localStorage.getItem('beezen_global_instances');
            return local ? JSON.parse(local) : [];
        }
        return data || [];
    },

    /**
     * Sauvegarde une instance (Visible par tous)
     */
    async saveInstance(instance) {
        const { data: { user } } = await supabase.auth.getUser();
        const instanceData = { ...instance, created_by: user?.id };

        const { data, error } = await supabase
            .from('instances')
            .insert([instanceData])
            .select();

        if (error) {
            console.warn("Erreur Supabase, sauvegarde locale de secours.");
            const current = await this.getInstances();
            const updated = [...current, { ...instanceData, id: Date.now() }];
            localStorage.setItem('beezen_global_instances', JSON.stringify(updated));
            return updated;
        }

        return data;
    },

    /**
     * Supprime une instance
     */
    async deleteInstance(id) {
        const { error } = await supabase
            .from('instances')
            .delete()
            .eq('id', id);

        if (error) {
            const current = await this.getInstances();
            const updated = current.filter(i => i.id !== id);
            localStorage.setItem('beezen_global_instances', JSON.stringify(updated));
        }
    }
};
