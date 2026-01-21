-- Migration: Add Google Calendar Integration
-- Created: 2026-01-21

-- Tabela para armazenar tokens OAuth do Google por dentista
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_name TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    calendar_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para mapear appointments com eventos do Google Calendar
CREATE TABLE IF NOT EXISTS appointment_google_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_dentist ON google_calendar_tokens(dentist_name);
CREATE INDEX IF NOT EXISTS idx_appointment_sync_appointment ON appointment_google_sync(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_sync_google_event ON appointment_google_sync(google_event_id);

-- Comentários
COMMENT ON TABLE google_calendar_tokens IS 'Armazena tokens OAuth2 do Google Calendar por dentista';
COMMENT ON TABLE appointment_google_sync IS 'Mapeia appointments locais com eventos do Google Calendar';
