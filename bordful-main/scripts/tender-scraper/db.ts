import { createClient } from '@supabase/supabase-js';
import type { ScrapedTender } from './types';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function upsertTender(tender: ScrapedTender): Promise<'inserted' | 'updated'> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('scraped_tenders')
    .select('id')
    .eq('source', tender.source)
    .eq('source_id', tender.sourceId)
    .maybeSingle();

  const row = {
    source: tender.source,
    source_id: tender.sourceId,
    title: tender.title,
    buyer_name: tender.buyerName ?? null,
    country: tender.country ?? null,
    cpv_codes: tender.cpvCodes,
    publication_date: tender.publicationDate ?? null,
    deadline_date: tender.deadlineDate ?? null,
    url: tender.url,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from('scraped_tenders').update(row).eq('id', existing.id);
    if (error) throw error;
    return 'updated';
  }

  const { error } = await supabase.from('scraped_tenders').insert(row);
  if (error) throw error;
  return 'inserted';
}

// Deactivates tenders past their deadline - mirrors the job scraper's
// sweeper concept, but far simpler: a passed deadline is an unambiguous
// fact from the source's own data, no liveness-check HTTP round trip
// needed the way job apply_url validity requires one.
export async function deactivateExpiredTenders(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('scraped_tenders')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('is_active', true)
    .lt('deadline_date', new Date().toISOString())
    .not('deadline_date', 'is', null)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}
