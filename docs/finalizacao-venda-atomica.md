# Finalizacao de Venda Atomica (Venda + OS + Financeiro)

## Objetivo
Evitar salvamento parcial no fechamento: a operacao deve ser tratada como "tudo ou nada".

## Regra de negocio
- A venda so deve ser considerada concluida quando:
  - `vendas` gravou com sucesso.
  - `ordens_servico` gravou com sucesso.
  - Lancamentos financeiros (entrada/saldo/parcelas) gravaram com sucesso.
- Se qualquer etapa falhar apos criar uma venda nova, o sistema deve executar rollback logico removendo registros parciais.

## Fluxo recomendado
1. Validar payload antes de gravar:
- `clinica_id` obrigatorio.
- `paciente_id` valido (ou criar paciente em venda manual).
- Campos financeiros minimos consistentes (`valor_total`, `valor_final`, `valor_entrada`, `metodo_pagamento`).

2. Persistir venda (`upsert` em `vendas`).

3. Persistir OS (`upsert` em `ordens_servico`).

4. Persistir financeiro:
- Entrada: inserir em `fluxo_caixa`.
- Se houver conta destino: atualizar saldo da conta via RPC `atualizar_saldo_conta`.
- Crediario: gerar `financeiro_parcelas`.
- Pagamento direto (pix/dinheiro/debito/cartao): registrar saldo em `fluxo_caixa`.

5. Se qualquer etapa 3/4 falhar:
- Executar rollback logico para venda nova:
  - delete `financeiro_parcelas` por `venda_id`
  - delete `ordens_servico` por `venda_id`
  - delete `fluxo_caixa` por `referencia_id` + `origem='venda_otica'`
  - delete `vendas` por `id`
- Retornar erro para frontend sem limpar formulario.

## Implementacao atual no projeto
Arquivo principal:
- `src/app/api/otica/vendas/finalize/route.ts`

Garantias implementadas:
- Fail-fast: erros de OS/financeiro nao sao mais ignorados.
- Rollback logico para vendas novas em erro pos-venda.
- Correcao de precedencia `??` com `||` (evita erro de compilacao no Next).
- HTTP 400 em validacoes de negocio (ex.: armacao inexistente), sem mascarar como 500.

## Prompt para usar no VS Code/Copilot
"Refatore o endpoint de finalizacao para comportamento atomico. Se qualquer etapa apos criar a venda falhar (OS, fluxo_caixa, parcelas ou RPC de saldo), execute rollback logico dos registros criados e retorne erro claro ao frontend. Nao deixe catch silencioso. Preserve compatibilidade com payload atual (qtd_parcelas_venda, os_detalhe, armacaoId/lenteId)."

## Checklist de integridade no Supabase
- FK obrigatoria: `ordens_servico.venda_id` -> `vendas.id`.
- RLS/Policies de insert/update/delete em:
  - `vendas`
  - `ordens_servico`
  - `fluxo_caixa`
  - `financeiro_parcelas`
- RPC `atualizar_saldo_conta` com permissao adequada para role de servidor.

## Observacao de arquitetura (ideal)
Para garantia transacional real de banco, evoluir para uma unica RPC PostgreSQL (BEGIN/COMMIT/ROLLBACK) executando todas as etapas em uma transacao unica.
