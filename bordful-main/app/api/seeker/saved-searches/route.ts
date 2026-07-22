import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  createSavedSearch,
  listSavedSearches,
  type SavedSearchFrequency,
} from '@/lib/jobs/saved-search-actions';
import {
  DEFAULT_SAVED_SEARCH_FILTERS,
  type SavedSearchFilters,
} from '@/lib/jobs/saved-search-matching';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const savedSearches = await listSavedSearches(session.user.id);
  return NextResponse.json({ savedSearches });
}

function sanitizeFilters(value: unknown): SavedSearchFilters {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SAVED_SEARCH_FILTERS;
  }
  const raw = value as Partial<SavedSearchFilters>;
  return {
    types: Array.isArray(raw.types) ? raw.types.filter((v) => typeof v === 'string') : [],
    roles: Array.isArray(raw.roles) ? raw.roles.filter((v) => typeof v === 'string') as SavedSearchFilters['roles'] : [],
    remote: raw.remote === true,
    salaryMin:
      typeof raw.salaryMin === 'number'
        ? raw.salaryMin
        : DEFAULT_SAVED_SEARCH_FILTERS.salaryMin,
    salaryMax:
      typeof raw.salaryMax === 'number'
        ? raw.salaryMax
        : DEFAULT_SAVED_SEARCH_FILTERS.salaryMax,
    visa: raw.visa === true,
    languages: Array.isArray(raw.languages) ? raw.languages.filter((v) => typeof v === 'string') as SavedSearchFilters['languages'] : [],
    companies: Array.isArray(raw.companies) ? raw.companies.filter((v) => typeof v === 'string') : [],
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const searchTerm =
    typeof body.searchTerm === 'string' && body.searchTerm.trim()
      ? body.searchTerm.trim().slice(0, 200)
      : null;

  const frequency: SavedSearchFrequency =
    body.frequency === 'weekly' ? 'weekly' : 'daily';

  try {
    const savedSearch = await createSavedSearch(session.user.id, {
      name,
      searchTerm,
      filters: sanitizeFilters(body.filters),
      frequency,
    });
    return NextResponse.json({ savedSearch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save search.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
