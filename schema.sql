-- === SCHEMA POUR SUPABASE (PARTAGE GLOBAL) ===
-- Copiez ce code dans l'éditeur SQL de votre projet Supabase (SQL Editor > New Query)

-- 1. Création de la table des instances (sans restriction de user_id pour le partage)
CREATE TABLE IF NOT EXISTS public.instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) -- On garde la trace de qui l'a créé
);

-- 2. Activation de la sécurité (RLS)
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;

-- 3. Politiques d'accès GLOBALES
-- Tout utilisateur authentifié peut VOIR toutes les instances
CREATE POLICY "Tout le monde voit les instances" 
ON public.instances FOR SELECT 
TO authenticated 
USING (true);

-- Tout utilisateur authentifié peut AJOUTER une instance
CREATE POLICY "Tout le monde ajoute des instances" 
ON public.instances FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Tout utilisateur authentifié peut SUPPRIMER une instance
CREATE POLICY "Tout le monde supprime des instances" 
ON public.instances FOR DELETE 
TO authenticated 
USING (true);
