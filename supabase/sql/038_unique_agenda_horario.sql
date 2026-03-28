-- 038: Garantir unicidade de horário por agenda
-- Adicione este arquivo ao seu editor SQL do Supabase e execute.

-- Verificar se existem duplicados antes de aplicar a constraint
-- Execute esta consulta primeiro para corrigir possíveis conflitos:
-- SELECT agenda_id, horario, count(*) FROM public.agenda_pacientes GROUP BY agenda_id, horario HAVING count(*) > 1;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_namespace ns JOIN pg_class c ON c.relnamespace = ns.oid JOIN pg_tables t ON t.tablename = c.relname WHERE ns.nspname = 'public' AND t.tablename = 'agenda_pacientes') THEN
		IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_horario_per_agenda') THEN
			ALTER TABLE public.agenda_pacientes
			ADD CONSTRAINT unique_horario_per_agenda UNIQUE (agenda_id, horario);
		END IF;
	END IF;
END
$$;
