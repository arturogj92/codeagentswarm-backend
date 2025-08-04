-- Create changelogs table for storing AI-generated changelogs
CREATE TABLE IF NOT EXISTS changelogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    previous_version VARCHAR(50),
    changelog TEXT NOT NULL,
    commit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add unique constraint on version
    CONSTRAINT unique_version UNIQUE (version)
);

-- Create index on version for faster lookups
CREATE INDEX idx_changelogs_version ON changelogs(version);

-- Create index on previous_version for range queries
CREATE INDEX idx_changelogs_previous_version ON changelogs(previous_version);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_changelogs_updated_at BEFORE UPDATE
    ON changelogs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE changelogs IS 'Stores AI-generated changelogs for each release version';
COMMENT ON COLUMN changelogs.version IS 'The release version this changelog is for';
COMMENT ON COLUMN changelogs.previous_version IS 'The previous release version to compare against';
COMMENT ON COLUMN changelogs.changelog IS 'AI-generated changelog content in markdown format';
COMMENT ON COLUMN changelogs.commit_count IS 'Number of commits included in this changelog';