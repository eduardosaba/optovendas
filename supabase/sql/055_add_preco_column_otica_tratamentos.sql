-- Migration: adicionar coluna preco e sincronizar com preco_adicional

ALTER TABLE public.otica_tratamentos
  ADD COLUMN IF NOT EXISTS preco numeric null default 0;

-- Copiar valores existentes de preco_adicional para preco quando preco for nulo ou zero
UPDATE public.otica_tratamentos
SET preco = COALESCE(preco, preco_adicional, 0)
WHERE preco IS NULL OR preco = 0;

-- Opcional: manter sincronização futura (trigger) — não criada aqui, dá para adicionar se desejado.
