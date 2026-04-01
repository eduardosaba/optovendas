import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

type Clinica = { id: string; nome?: string | null };

// Server action moved to top-level to avoid capturing non-serializable closures
export async function createUser(formData: FormData) {
  'use server';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) throw new Error('Server not configured');
  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const clinica_id = String(formData.get('clinica_id') || '');
  const nome_completo = String(formData.get('nome_completo') || '');
  const email = String(formData.get('email') || '').toLowerCase().trim();
  const perfil = String(formData.get('perfil') || 'vendedor');
  const ativo = formData.get('ativo') === 'on';
  const password = String(formData.get('password') || 'Mudar@123');

  if (!clinica_id || !email || !nome_completo) {
    throw new Error('clinica_id, nome_completo e email são obrigatórios');
  }

  const clin = await supabaseAdmin.from('clinicas').select('id').eq('id', clinica_id).maybeSingle();
  if (clin.error) throw clin.error;
  if (!clin.data) throw new Error('Clinica não encontrada');

  const { data: authRes, error: authError } = await (supabaseAdmin as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo, clinica_id, perfil }
  });
  if (authError) throw authError;
  const userId = authRes.user?.id;

  const { error: dbError } = await supabaseAdmin.from('usuarios_unidade').insert({
    clinica_id,
    nome_completo,
    email,
    perfil,
    ativo: !!ativo,
    user_id: userId,
  });
  if (dbError) {
    if (userId) await (supabaseAdmin as any).auth.admin.deleteUser(userId);
    throw dbError;
  }

  redirect('/admin/equipe');
}

export default async function Page({ searchParams }: { searchParams?: Record<string, string> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) throw new Error('Server not configured');
  const supabaseAdmin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const clinicsRes: any = await supabaseAdmin.from('clinicas').select('id, nome').order('nome', { ascending: true });
  const clinics: Clinica[] = clinicsRes.error ? [] : (clinicsRes.data || []);

  const pref = {
    clinica_id: searchParams?.clinica_id || '',
    nome_completo: searchParams?.nome_completo || '',
    email: searchParams?.email || '',
    perfil: searchParams?.perfil || 'vendedor',
    password: searchParams?.password || '',
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-black mb-4">Criar Usuário (Server-side)</h2>
      {clinics.length === 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded text-amber-800">
          Nenhuma clínica encontrada. Cadastre pelo painel de administração antes de criar usuários.
        </div>
      )}
      <form action={createUser} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Clinica</label>
          <select name="clinica_id" defaultValue={pref.clinica_id} className="w-full p-3 rounded">
            <option value="">Selecione a clínica</option>
            {clinics.map(c => (
              <option key={c.id} value={c.id}>{c.nome || c.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Nome completo</label>
          <input name="nome_completo" defaultValue={pref.nome_completo} className="w-full p-3 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input name="email" defaultValue={pref.email} type="email" className="w-full p-3 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium">Perfil</label>
          <select name="perfil" defaultValue={pref.perfil} className="w-full p-3 rounded">
            <option value="vendedor">Vendedor</option>
            <option value="admin_clinica">Admin Clínica</option>
            <option value="master">Master</option>
          </select>
        </div>
        <div>
          <label className="inline-flex items-center gap-2">
            <input name="ativo" type="checkbox" defaultChecked />
            <span className="text-sm">Ativo</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium">Senha (opcional)</label>
          <input name="password" defaultValue={pref.password} type="password" className="w-full p-3 rounded" />
        </div>

        <div>
          <button type="submit" disabled={clinics.length === 0} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black disabled:opacity-50">Criar</button>
          {clinics.length === 0 && <p className="text-sm text-amber-600 mt-2">Crie uma clínica antes de adicionar usuários.</p>}
        </div>
      </form>
    </div>
  );
}
