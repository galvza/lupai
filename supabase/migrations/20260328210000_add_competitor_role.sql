-- Adiciona coluna role na tabela competitors para diferenciar
-- concorrentes reais do negocio do usuario (Modo Completo)
-- D-05: role TEXT NOT NULL DEFAULT 'competitor' CHECK (role IN ('competitor', 'user_business'))

ALTER TABLE competitors
  ADD COLUMN role TEXT NOT NULL DEFAULT 'competitor'
  CHECK (role IN ('competitor', 'user_business'));

-- Index para queries filtradas por role (D-10, D-08)
CREATE INDEX idx_competitors_role ON competitors(role);
