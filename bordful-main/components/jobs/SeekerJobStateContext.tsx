'use client';

import { useSession } from 'next-auth/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type ApplicationStatus = 'applied' | 'not_interested';

type SeekerJobState = {
  savedJobIds: Set<string>;
  applications: Record<string, ApplicationStatus>;
  isSeeker: boolean;
  toggleSave: (jobId: string) => Promise<void>;
  setApplication: (jobId: string, status: ApplicationStatus) => Promise<void>;
  clearApplication: (jobId: string) => Promise<void>;
};

const SeekerJobStateReactContext = createContext<SeekerJobState | null>(null);

export function SeekerJobStateProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isSeeker = session?.user?.role === 'seeker';

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<
    Record<string, ApplicationStatus>
  >({});

  useEffect(() => {
    if (status !== 'authenticated' || !isSeeker) return;

    let cancelled = false;
    fetch('/api/seeker/job-states')
      .then((res) => res.json())
      .then((data: { savedJobIds: string[]; applications: Record<string, ApplicationStatus> }) => {
        if (cancelled) return;
        setSavedJobIds(new Set(data.savedJobIds));
        setApplications(data.applications);
      })
      .catch(() => {
        // Non-fatal: cards just fall back to showing unsaved/no-status.
      });

    return () => {
      cancelled = true;
    };
  }, [status, isSeeker]);

  const toggleSave = useCallback(
    async (jobId: string) => {
      const isSaved = savedJobIds.has(jobId);

      // Optimistic update - flip immediately, revert if the request fails.
      setSavedJobIds((prev) => {
        const next = new Set(prev);
        if (isSaved) {
          next.delete(jobId);
        } else {
          next.add(jobId);
        }
        return next;
      });

      try {
        const res = isSaved
          ? await fetch(`/api/seeker/saved-jobs?jobId=${jobId}`, {
              method: 'DELETE',
            })
          : await fetch('/api/seeker/saved-jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId }),
            });
        if (!res.ok) throw new Error('save failed');
      } catch {
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          if (isSaved) {
            next.add(jobId);
          } else {
            next.delete(jobId);
          }
          return next;
        });
      }
    },
    [savedJobIds]
  );

  const setApplication = useCallback(
    async (jobId: string, statusValue: ApplicationStatus) => {
      const previous = applications[jobId];
      setApplications((prev) => ({ ...prev, [jobId]: statusValue }));

      try {
        const res = await fetch('/api/seeker/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, status: statusValue }),
        });
        if (!res.ok) throw new Error('update failed');
      } catch {
        setApplications((prev) => {
          const next = { ...prev };
          if (previous) {
            next[jobId] = previous;
          } else {
            delete next[jobId];
          }
          return next;
        });
      }
    },
    [applications]
  );

  const clearApplication = useCallback(
    async (jobId: string) => {
      const previous = applications[jobId];
      setApplications((prev) => {
        const next = { ...prev };
        delete next[jobId];
        return next;
      });

      try {
        const res = await fetch(`/api/seeker/applications?jobId=${jobId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('clear failed');
      } catch {
        if (previous) {
          setApplications((prev) => ({ ...prev, [jobId]: previous }));
        }
      }
    },
    [applications]
  );

  return (
    <SeekerJobStateReactContext.Provider
      value={{
        savedJobIds,
        applications,
        isSeeker,
        toggleSave,
        setApplication,
        clearApplication,
      }}
    >
      {children}
    </SeekerJobStateReactContext.Provider>
  );
}

export function useSeekerJobState() {
  const ctx = useContext(SeekerJobStateReactContext);
  if (!ctx) {
    throw new Error(
      'useSeekerJobState must be used within a SeekerJobStateProvider'
    );
  }
  return ctx;
}
