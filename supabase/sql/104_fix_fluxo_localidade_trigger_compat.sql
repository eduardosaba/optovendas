-- Compatibilidade de trigger de vendas -> fluxo_caixa
-- Evita erro "record NEW has no field localidade" em bancos onde a coluna na tabela vendas
-- foi padronizada para localidade_venda.

CREATE OR REPLACE FUNCTION public.trg_entrada_fluxo_caixa_apos_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC(12,2);
  v_localidade TEXT;
BEGIN
  v_valor := COALESCE(NEW.valor_final, NEW.valor_total, 0);

  IF v_valor <= 0 THEN
    RETURN NEW;
  END IF;

  -- Leitura resiliente: funciona mesmo se uma das chaves não existir no registro.
  v_localidade := COALESCE(
    to_jsonb(NEW)->>'localidade',
    to_jsonb(NEW)->>'localidade_venda',
    'Geral'
  );

  INSERT INTO fluxo_caixa (
    clinica_id,
    tipo,
    origem,
    referencia_id,
    descricao,
    valor,
    localidade,
    data_movimento
  )
  VALUES (
    NEW.clinica_id,
    'entrada',
    'venda_automatica',
    NEW.id,
    'Entrada automatica gerada pela venda',
    v_valor,
    v_localidade,
    CURRENT_DATE
  )
  ON CONFLICT (referencia_id, clinica_id)
  WHERE tipo = 'entrada' AND origem = 'venda_automatica'
  DO NOTHING;

  RETURN NEW;
END;
$$;
