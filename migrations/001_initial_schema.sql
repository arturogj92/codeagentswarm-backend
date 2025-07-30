-- Migration: 001_initial_schema
-- Created at: 2025-01-30
-- Description: Initial schema for CodeAgentSwarm backend

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RELEASES TABLE (para el sistema de actualizaciones automáticas)
CREATE TABLE IF NOT EXISTS releases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('darwin', 'win32', 'linux')),
  arch VARCHAR(20) NOT NULL CHECK (arch IN ('x64', 'arm64', 'ia32')),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- URL donde está el archivo (GitHub Releases o Supabase Storage)
  file_size BIGINT NOT NULL,
  sha512 VARCHAR(128) NOT NULL,
  release_notes TEXT,
  is_prerelease BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version, platform, arch)
);

-- Indexes para releases
CREATE INDEX idx_releases_platform_arch ON releases(platform, arch);
CREATE INDEX idx_releases_version ON releases(version);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_releases_updated_at BEFORE UPDATE
    ON releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Por ahora solo la tabla de releases para el sistema de actualizaciones
-- Sentry se encargará de los crashes y errores