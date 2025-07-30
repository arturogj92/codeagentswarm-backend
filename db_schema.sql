-- CodeAgentSwarm Backend Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Releases table
CREATE TABLE IF NOT EXISTS releases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('darwin', 'win32', 'linux')),
  arch VARCHAR(20) NOT NULL CHECK (arch IN ('x64', 'arm64', 'ia32')),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sha512 VARCHAR(128) NOT NULL,
  release_notes TEXT,
  is_prerelease BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(version, platform, arch)
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  support_ticket_id VARCHAR(50) UNIQUE NOT NULL,
  app_version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  arch VARCHAR(20) NOT NULL,
  log_content TEXT NOT NULL, -- Path to log file in storage
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crash reports table
CREATE TABLE IF NOT EXISTS crash_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  app_version VARCHAR(50) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  arch VARCHAR(20) NOT NULL,
  crash_dump_url TEXT, -- Path to crash dump in storage
  error_message TEXT,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_releases_platform_arch ON releases(platform, arch);
CREATE INDEX idx_releases_version ON releases(version);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_ticket_id ON logs(support_ticket_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);
CREATE INDEX idx_crash_reports_user_id ON crash_reports(user_id);
CREATE INDEX idx_crash_reports_created_at ON crash_reports(created_at);

-- Create updated_at trigger for releases table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_releases_updated_at BEFORE UPDATE
    ON releases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();