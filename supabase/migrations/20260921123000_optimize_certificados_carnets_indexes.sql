-- Indexes to convert sequential scans into index scans on the most
-- common filter/sort/join patterns for certificados and carnets.
-- All use CONCURRENTLY to avoid locking the tables during creation.

-- certificados: paginated listing & date-range reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificados_fecha_emision_desc
  ON certificados (fecha_emision DESC, id DESC);

-- certificados: lookup by OSI number (batch download, indicadores)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificados_nro_osi
  ON certificados (nro_osi);

-- certificados: filter by company (gestión, portal cliente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificados_id_empresa
  ON certificados (id_empresa);

-- certificados: filter by course (gestión, reportes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certificados_id_curso
  ON certificados (id_curso);

-- carnets: paginated listing by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carnets_fecha_emision_desc
  ON carnets (fecha_emision DESC);

-- carnets: join carnet → certificado (batch download, anulación)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carnets_id_certificado
  ON carnets (id_certificado);

-- carnets: filter by company
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carnets_id_empresa
  ON carnets (id_empresa);
