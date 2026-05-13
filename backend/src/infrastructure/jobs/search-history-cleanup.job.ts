import cron from 'node-cron';
import { supabase } from '../db/supabase.client';

export function startSearchHistoryCleanupJob(): void {
  cron.schedule('0 * * * *', async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('historial_busquedas')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('[search-history-cleanup] Error:', error.message);
      return;
    }
    console.log(`[search-history-cleanup] Eliminados ${data?.length ?? 0} registros expirados`);
  });

  console.log('[search-history-cleanup] Job registrado — se ejecuta cada hora');
}
