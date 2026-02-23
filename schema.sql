-- Schéma pour Cloudflare D1
-- Utilisé pour stocker les instances Zendesk et les statistiques agrégées

-- Table des instances Zendesk par utilisateur
CREATE TABLE IF NOT EXISTS instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL, -- ID de l'utilisateur Supabase
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des statistiques agrégées (pour optimiser le volume BDD)
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL,
  timestamp DATETIME NOT NULL,
  category TEXT NOT NULL, -- Ex: 'Authentification', 'Paiement'
  volume INTEGER DEFAULT 0,
  frt_average INTEGER DEFAULT 0, -- Temps moyen de première réponse
  FOREIGN KEY (instance_id) REFERENCES instances(id)
);
