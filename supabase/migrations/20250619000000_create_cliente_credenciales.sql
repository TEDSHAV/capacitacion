-- Create cliente_credenciales table for client portal authentication
-- Allows multiple user accounts per company (empresa_id is NOT unique)
CREATE TABLE public.cliente_credenciales (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES public.empresas(id),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cliente_credenciales ENABLE ROW LEVEL SECURITY;

-- Admin (authenticated) can do everything
CREATE POLICY "Admin full access cliente_credenciales" ON public.cliente_credenciales
  FOR ALL USING (auth.role() = 'authenticated');

-- Public can read for login verification (username/password check)
CREATE POLICY "Public read for login" ON public.cliente_credenciales
  FOR SELECT USING (true);
