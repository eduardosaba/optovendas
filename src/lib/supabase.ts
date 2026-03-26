import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Configuração para evitar problemas de Navigator Lock em ambientes com múltiplas
// abas ou HMR (Next.js dev). Forçamos uma chave de storage customizada e
// mantemos as opções de sessão ativas.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		// chave customizada para evitar conflitos com outros contextos
		storageKey: 'sb-optovendas-auth',
	},
});
