-- Add new orchestration status values to analysis_status enum
-- Each ADD VALUE must be outside a transaction (PostgreSQL restriction)
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'discovering';
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'waiting_confirmation';
ALTER TYPE analysis_status ADD VALUE IF NOT EXISTS 'extracting';
