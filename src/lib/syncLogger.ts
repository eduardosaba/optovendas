import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getAdmin() {
  if (!supabaseUrl || !serviceRole) return null;
  return createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
}

export async function logSync(jobId: any, jobType: string, status: 'started' | 'success' | 'failed', message?: string, extra?: any) {
  const meta = { message: message || null, extra: extra ? JSON.stringify(extra).slice(0, 10000) : null };
  try {
    const admin = getAdmin();
    if (!admin) {
      console[status === 'failed' ? 'error' : 'log'](`syncLog [${jobType}] ${status}: ${message || ''}`);
      return;
    }
    // try insert into sync_logs table if available
    await admin.from('sync_logs').insert({ job_id: jobId ? String(jobId) : null, job_type: jobType, status, message: message || null, meta: meta.extra });
  } catch (err) {
    // fallback to console
    console.error('syncLogger failed to write to DB', err);
    console[status === 'failed' ? 'error' : 'log'](`syncLog [${jobType}] ${status}: ${message || ''}`);
  }
}
