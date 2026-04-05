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
  v_numero_os TEXT;
  v_paciente_nome TEXT;
  v_descricao TEXT;
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

  v_numero_os := COALESCE(to_jsonb(NEW)->>'numero_os_manual', to_jsonb(NEW)->>'numero_os', '');
  SELECT p.nome_completo INTO v_paciente_nome FROM pacientes p WHERE p.id = (to_jsonb(NEW)->>'paciente_id')::uuid;

  IF v_numero_os IS NOT NULL AND trim(v_numero_os) <> '' AND v_paciente_nome IS NOT NULL THEN
    v_descricao := format('Entrada venda OS #%s — %s', v_numero_os, v_paciente_nome);
  ELSIF v_numero_os IS NOT NULL AND trim(v_numero_os) <> '' THEN
    v_descricao := format('Entrada venda OS #%s', v_numero_os);
  ELSIF v_paciente_nome IS NOT NULL THEN
    v_descricao := format('Entrada venda — %s', v_paciente_nome);
  ELSE
    v_descricao := 'Entrada automatica gerada pela venda';
  END IF;

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
    v_descricao,
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
