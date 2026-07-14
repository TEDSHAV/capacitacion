-- Create table for certificate templates
CREATE TABLE IF NOT EXISTS plantillas_certificados (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    archivo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plantillas_certificados_active ON plantillas_certificados(is_active);
CREATE INDEX IF NOT EXISTS idx_plantillas_certificados_created_at ON plantillas_certificados(created_at);

-- Add RLS policies (if using Supabase)
ALTER TABLE plantillas_certificados ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read templates
CREATE POLICY "Users can view active certificate templates" ON plantillas_certificados
    FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- Create policy for authenticated users to insert templates
CREATE POLICY "Users can insert certificate templates" ON plantillas_certificados
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update their own templates
CREATE POLICY "Users can update certificate templates" ON plantillas_certificados
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete templates
CREATE POLICY "Users can delete certificate templates" ON plantillas_certificados
    FOR DELETE USING (auth.role() = 'authenticated');
