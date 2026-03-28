-- 040_add_pupilometro_columns_ordens_servico.sql
-- Garante que existam colunas para armazenar a foto limpa e a foto anotada (medidas)

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS pupilometro_foto_url TEXT,
  ADD COLUMN IF NOT EXISTS pupilometro_foto_medida_url TEXT;

-- Observação:
-- O frontend salva URLs em `pupilometroFotoStorageUrl` e `pupilometroFotoMedidaStorageUrl` no objeto da OS.
-- Ao persistir no backend/endpoint que grava a OS, assegure mapear esses campos para os nomes snake_case usados no banco.
