-- Adiciona flags clínicos e tratamentos para receitas_optometricas

ALTER TABLE IF EXISTS receitas_optometricas
ADD COLUMN IF NOT EXISTS miopia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS astigmatismo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hipermetropia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS presbiopia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tratamento_antirreflexo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tratamento_fotossensivel BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_receitas_miopia ON receitas_optometricas(miopia);
CREATE INDEX IF NOT EXISTS idx_receitas_astigmatismo ON receitas_optometricas(astigmatismo);
CREATE INDEX IF NOT EXISTS idx_receitas_hipermetropia ON receitas_optometricas(hipermetropia);
