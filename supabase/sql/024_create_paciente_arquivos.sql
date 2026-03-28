-- 024_create_paciente_arquivos.sql
-- Cria tabela para armazenar arquivos digitalizados do prontuário do paciente

CREATE TABLE IF NOT EXISTS public.paciente_arquivos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
    venda_id uuid REFERENCES public.vendas(id) ON DELETE SET NULL,
    url_arquivo text NOT NULL,
    tipo_arquivo text CHECK (tipo_arquivo IN ('receita', 'comprovante', 'documento', 'exame', 'outros')),
    criado_em timestamptz DEFAULT now(),
    criado_por uuid REFERENCES auth.users(id)
);

-- Habilitar RLS (ajuste de políticas conforme necessário)
ALTER TABLE IF EXISTS public.paciente_arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas base (ajuste conforme a política de sua aplicação)
DROP POLICY IF EXISTS permitir_leitura_clinica ON public.paciente_arquivos;
CREATE POLICY permitir_leitura_clinica ON public.paciente_arquivos FOR SELECT USING (true);

DROP POLICY IF EXISTS permitir_insercao_clinica ON public.paciente_arquivos;
CREATE POLICY permitir_insercao_clinica ON public.paciente_arquivos FOR INSERT WITH CHECK (true);
