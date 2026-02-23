-- === SCHEMA POUR SUPABASE ===
-- Copiez ce code dans l'éditeur SQL de votre projet Supabase (SQL Editor > New Query)

-- 1. Création de la table des instances
CREATE TABLE IF NOT EXISTS public.instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL
);

-- 2. Activation de la sécurité (RLS)
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;

-- 3. Politiques d'accès
CREATE POLICY "Les utilisateurs voient leurs propres instances" 
ON public.instances FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs ajoutent leurs propres instances" 
ON public.instances FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs suppriment leurs propres instances" 
ON public.instances FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
