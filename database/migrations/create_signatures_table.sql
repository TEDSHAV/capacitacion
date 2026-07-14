-- Create signatures table
CREATE TABLE IF NOT EXISTS signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('facilitador', 'representante_sha')),
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_signatures_type ON signatures(type);
CREATE INDEX IF NOT EXISTS idx_signatures_created_at ON signatures(created_at DESC);
