-- Script para configurar Policies (RLS) do bucket `branding-assets` no Supabase Storage
-- Execute no Supabase SQL Editor

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir Upload Logado" ON storage.objects;
DROP POLICY IF EXISTS "Leitura Publica Logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Update Logado" ON storage.objects;

-- Permitir que usuários autenticados façam INSERT (upload) apenas para o bucket 'branding-assets'
CREATE POLICY "Permitir Upload Logado" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding-assets');

-- Permitir leitura pública dos objetos do bucket 'branding-assets'
CREATE POLICY "Leitura Publica Logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'branding-assets');

-- Permitir UPDATE (overwrite) por usuários autenticados no bucket 'branding-assets'
CREATE POLICY "Permitir Update Logado" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding-assets');

-- Observações:
-- 1) Verifique em Storage > Buckets > branding-assets se 'Public bucket' está ativado quando desejar servir imagens sem autenticação.
-- 2) Se você usar UPLOAD com upsert: true, pode ser necessário ajustar as policies de UPDATE/INSERT conforme os campos enviados.
-- 3) Teste com um upload via UI após aplicar as policies para confirmar o comportamento.
