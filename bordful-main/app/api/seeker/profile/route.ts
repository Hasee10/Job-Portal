import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  DEFAULT_SAVED_SEARCH_FILTERS,
  type SavedSearchFilters,
} from '@/lib/jobs/saved-search-matching';
import { getSeekerProfile, saveSeekerProfile } from '@/lib/jobs/seeker-profile-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const profile = await getSeekerProfile(session.user.id);
  return NextResponse.json({ profile });
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
    companies: [],
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'seeker') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const searchTerm =
    typeof body.searchTerm === 'string' && body.searchTerm.trim()
      ? body.searchTerm.trim().slice(0, 200)
      : null;

  const profile = await saveSeekerProfile(session.user.id, {
    searchTerm,
    filters: sanitizeFilters(body.filters),
  });

  return NextResponse.json({ profile });
}
