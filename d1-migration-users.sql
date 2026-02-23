-- === SCHEMA POUR CLOUDFLARE D1 (MISE À JOUR AGENTS & CANAUX) ===

-- 1. Ajout de la colonne assignee_id à la table des tickets
ALTER TABLE tickets ADD COLUMN assignee_id INTEGER;

-- 2. Création de la table des utilisateurs (Agents) pour les performances
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    instance_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
    role TEXT,
    active BOOLEAN
);

-- Index pour les perfs agents
CREATE INDEX IF NOT EXISTS idx_users_instance ON users (instance_id);
