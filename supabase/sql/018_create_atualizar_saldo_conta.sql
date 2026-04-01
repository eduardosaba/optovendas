-- Cria função RPC atualizar_saldo_conta
CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta(target_conta_id uuid, valor_add numeric)
RETURNS void AS $$
BEGIN
  UPDATE public.conta_corrente
  SET saldo_atual = COALESCE(saldo_atual, 0) + valor_add,
      criado_em = NOW()
  WHERE id = target_conta_id;
END;
$$ LANGUAGE plpgsql;