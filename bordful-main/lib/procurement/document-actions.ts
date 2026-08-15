import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getRequestForBuyer } from './request-actions';
import { isSealedFromBuyer } from './response-actions';

const BUCKET = 'procurement-documents';
export const MAX_PROPOSAL_DOCUMENT_BYTES = 10 * 1024 * 1024; // matches the bucket's file_size_limit
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database is not configured on this deployment.');
  return createClient(url, key, { auth: { persistSession: false } });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

// Proxies the upload through our own server rather than issuing the vendor a
// direct signed upload URL - keeps the bucket entirely inaccessible from the
// browser, consistent with the rest of this app never doing client-side
// Supabase access. Returns the storage object path, not a public URL - the
// bucket is private, so every read goes through getSignedDownloadUrl below.
export async function uploadProposalDocument(
  vendorId: string,
  requestId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_PROPOSAL_DOCUMENT_BYTES) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error('Unsupported file type. Upload a PDF or Word document.');
  }

  const supabase = getAdminClient();
  const path = `${requestId}/${vendorId}/${Date.now()}-${sanitizeFilename(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(error.message || 'Failed to upload document.');
  return path;
}

// Verifies the caller is either the request's buyer or the vendor who owns
// the response the document is attached to before minting a short-lived
// signed URL - the storage path alone is not treated as a capability token.
// Also enforces the same sealed-bid rule as listResponsesForRequest: a
// buyer cannot download a sealed request's proposal documents before bids
// are opened, even though they own the request - a document is exactly as
// much "response content" as the pricing/proposal text fields are.
export async function getSignedDownloadUrl(
  requesterId: string,
  requesterRole: 'employer' | 'vendor',
  requestId: string,
  documentPath: string
): Promise<string> {
  const supabase = getAdminClient();

  const { data: response } = await supabase
    .from('procurement_responses')
    .select('vendor_id')
    .eq('request_id', requestId)
    .eq('proposal_document_path', documentPath)
    .maybeSingle();
  if (!response) throw new Error('Document not found for this request.');

  if (requesterRole === 'employer') {
    const request = await getRequestForBuyer(requesterId, requestId);
    if (!request) throw new Error('Not authorized to access this document.');
    if (isSealedFromBuyer(request.sealedBids, request.status)) {
      throw new Error('This request is sealed - documents are hidden until bids are opened.');
    }
  } else if (response.vendor_id !== requesterId) {
    throw new Error('Not authorized to access this document.');
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(documentPath, 60 * 5); // 5 minutes

  if (error || !data) throw new Error(error?.message || 'Failed to generate download link.');
  return data.signedUrl;
}
