-- Migration pour l'intégration JIRA
ALTER TABLE tickets ADD COLUMN tags TEXT;
ALTER TABLE tickets ADD COLUMN custom_fields_json TEXT;
