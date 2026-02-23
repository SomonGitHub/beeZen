-- === SCHEMA POUR CLOUDFLARE D1 (STOCAKGE DES TICKETS) ===
-- Ce fichier contient les tables à créer dans votre base D1 via le menu "D1" de Cloudflare.

-- 1. Table des tickets (Source de vérité pour le Dashboard)
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY,          -- ID Zendesk
    instance_id TEXT NOT NULL,       -- ID de l'instance (UUID de Supabase)
    subject TEXT,
    status TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    brand_name TEXT,
    channel TEXT,
    metrics_json TEXT,               -- Stockage JSON des metrics (reply_time, etc.)
    raw_data TEXT                    -- Optionnel: JSON complet du ticket pour audit
);

-- 2. Table pour le suivi de la synchronisation (Delta Sync)
CREATE TABLE IF NOT EXISTS sync_status (
    instance_id TEXT PRIMARY KEY,
    last_sync_timestamp INTEGER,     -- UNIX Timestamp du dernier delta récupéré
    last_sync_date DATETIME,
    ticket_count INTEGER DEFAULT 0
);

-- Index pour accélérer les filtrages du Dashboard
CREATE INDEX IF NOT EXISTS idx_tickets_instance_date ON tickets (instance_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
