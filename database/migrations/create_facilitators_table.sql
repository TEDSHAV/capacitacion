-- Create facilitators table
CREATE TABLE IF NOT EXISTS facilitators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(255) NOT NULL,
  course_topics TEXT[] NOT NULL, -- Array of course topics
  technical_knowledge TEXT,
  rating DECIMAL(3,1) CHECK (rating >= 1 AND rating <= 5), -- Rating from 1-5 with 1 decimal
  resume_url TEXT,
  signature_id UUID REFERENCES signatures(id), -- Link to signature if available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_facilitators_city ON facilitators(city);
CREATE INDEX IF NOT EXISTS idx_facilitators_email ON facilitators(email);
CREATE INDEX IF NOT EXISTS idx_facilitators_created_at ON facilitators(created_at DESC);

-- Create GIN index for course_topics array for efficient searching
CREATE INDEX IF NOT EXISTS idx_facilitators_course_topics ON facilitators USING GIN(course_topics);
