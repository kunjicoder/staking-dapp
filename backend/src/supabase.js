import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { persistSession: false },
});

// numeric columns come back through PostgREST as JSON numbers, which silently
// lose precision above 2^53 — always select the amount column with ::text.
export const EVENT_COLUMNS = 'id, tx_hash, log_index, event_type, wallet, amount::text, block_number, ts';
