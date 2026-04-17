import { createClient } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function makeMissingClient(msg: string) {
	console.error(msg);
	const dummy = {
		from: () => ({
			select: async () => ({ data: [], error: { message: msg } }),
			insert: async () => ({ data: null, error: { message: msg } }),
			update: async () => ({ data: null, error: { message: msg } }),
			delete: async () => ({ data: null, error: { message: msg } }),
			maybeSingle: async () => ({ data: null, error: { message: msg } }),
		}),
		auth: {
			onAuthStateChange: () => ({ data: null }),
			signOut: async () => ({}),
			getSession: async () => ({ data: { session: null } }),
		},
	} as any;
	return dummy;
}

let supabaseClient: any;

if (!supabaseUrl || !supabaseAnonKey) {
	const msg = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. Set them and restart the dev server.';
	supabaseClient = makeMissingClient(msg);
} else {
	// Configuração para evitar problemas de Navigator Lock em ambientes com múltiplas
	// abas ou HMR (Next.js dev). Forçamos uma chave de storage customizada e
	// mantemos as opções de sessão ativas.
	supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
			// chave customizada para evitar conflitos com outros contextos
			storageKey: 'sb-optovendas-auth',
		},
	});

	// Handle token refresh failures proactively: clear local session and redirect to login
	// This avoids repeated 400 responses when the stored refresh token is invalid/expired.
	try {
		supabaseClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
			void session;
			if (String(event) === 'TOKEN_REFRESH_FAILED') {
				try { localStorage.removeItem('sb-optovendas-auth'); } catch (e) {}
				// attempt to sign out client-side to clear any in-memory state
				supabaseClient.auth.signOut().catch(() => {});
				if (typeof window !== 'undefined') {
					window.location.href = '/(auth)/login';
				}
			}
		});
	} catch (e) {
		// noop - defensive in case auth client API differs in some envs
	}
}

export const supabase = supabaseClient;
